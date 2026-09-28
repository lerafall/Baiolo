import { describe, expect, it, vi } from "vitest";
import type { JevResult } from "@/lib/jev";
import { askJev, JevError } from "@/lib/jev";
import {
  precheckFromJev,
  runModerationPrecheck,
} from "@/lib/jev-moderation";

const config = { apiKey: "test", baseUrl: "https://jev.test/v1", model: "jev-latest" };

function jevResult(nouls: Record<string, number>): JevResult {
  return {
    model: "jev-1.13.0",
    answers: Object.fromEntries(
      Object.entries(nouls).map(([k, noul]) => [k, { type: "noul" as const, noul }]),
    ),
  };
}

const friendly = {
  title: "Cloud Hopper",
  description: "Soft clouds and sunny coins",
  sourceLabel: "cloud.zip",
};

describe("precheckFromJev", () => {
  it("is low when every concern is unlikely", () => {
    expect(precheckFromJev(jevResult({ sexual: 0.02, scam: 0.1 }))).toEqual({
      risk: "low",
      flags: [],
    });
  });

  it("is medium for one moderate concern", () => {
    const r = precheckFromJev(jevResult({ spam: 0.6 }));
    expect(r.risk).toBe("medium");
    expect(r.flags).toEqual(["Looks like spam or advertising (60%)"]);
  });

  it("is high for one strong or two moderate concerns", () => {
    expect(precheckFromJev(jevResult({ scam: 0.9 })).risk).toBe("high");
    expect(precheckFromJev(jevResult({ gore: 0.55, hate: 0.6 })).risk).toBe("high");
  });

  it("ignores missing or malformed answers", () => {
    const result = {
      model: "jev-1.13.0",
      answers: { gore: { type: "choice", choice: "x", confidence: 1, probabilities: {} } },
    } as JevResult;
    expect(precheckFromJev(result).risk).toBe("low");
  });
});

describe("runModerationPrecheck", () => {
  it("uses the keyword mock when off or not configured", async () => {
    const ask = vi.fn();
    expect((await runModerationPrecheck(friendly, { mode: "off", config, ask })).source).toBe("mock");
    expect((await runModerationPrecheck(friendly, { mode: "on", config: null, ask })).source).toBe("mock");
    expect(ask).not.toHaveBeenCalled();
  });

  it("shadow keeps the mock decision and records Jev's verdict separately", async () => {
    const ask = vi.fn(async () => jevResult({ scam: 0.92 })) as unknown as typeof askJev;
    const r = await runModerationPrecheck(friendly, { mode: "shadow", config, ask });
    expect(r.risk).toBe("low");
    expect(r.flags).toEqual([]);
    expect(r.shadowNote).toBe("Jev (shadow): high — Possible phishing or scam (92%)");
  });

  it("on lets Jev decide", async () => {
    const ask = vi.fn(async () => jevResult({ spam: 0.7 })) as unknown as typeof askJev;
    const r = await runModerationPrecheck(friendly, { mode: "on", config, ask });
    expect(r).toMatchObject({ risk: "medium", source: "jev", jevModel: "jev-1.13.0" });
  });

  it("falls back to the mock when Jev fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ask = vi.fn(async () => {
      throw new JevError("jev_timeout");
    }) as unknown as typeof askJev;
    const on = await runModerationPrecheck(friendly, { mode: "on", config, ask });
    expect(on.source).toBe("mock_fallback");
    expect(on.risk).toBe("low");
    const shadow = await runModerationPrecheck(friendly, { mode: "shadow", config, ask });
    expect(shadow.shadowNote).toBeUndefined();
    warn.mockRestore();
  });
});

describe("askJev", () => {
  it("posts state and questions to /systemone", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(jevResult({ spam: 0.1 })), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const out = await askJev("hello", { spam: { type: "noul", instructions: "Spam?" } }, { config });
    expect(out.model).toBe("jev-1.13.0");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://jev.test/v1/systemone");
    expect(JSON.parse(String(init.body))).toMatchObject({ state: "hello", model: "jev-latest" });
    vi.unstubAllGlobals();
  });

  it("throws on HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 429 })));
    await expect(askJev("x", {}, { config })).rejects.toMatchObject({ message: "jev_http_429", status: 429 });
    vi.unstubAllGlobals();
  });
});

import { describe, expect, it } from "vitest";
import { localeFromAcceptLanguage } from "@/lib/i18n/config";
import { getMessages, translate } from "@/lib/i18n/translate";

describe("i18n", () => {
  it("detects Polish from Accept-Language", () => {
    expect(localeFromAcceptLanguage("pl-PL,pl;q=0.9")).toBe("pl");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
  });

  it("translates Polish nav labels", () => {
    const messages = getMessages("pl");
    expect(translate(messages, "nav.explore")).toBe("Odkrywaj");
    expect(translate(messages, "landing.startExploring")).toBe(
      "Zacznij odkrywać",
    );
  });

  it("interpolates variables", () => {
    const messages = getMessages("en");
    expect(
      translate(messages, "card.playsReactions", {
        plays: "1.2k",
        reactions: 3,
      }),
    ).toBe("1.2k plays · 3 reactions");
  });
});

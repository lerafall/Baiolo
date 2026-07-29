import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getPublicSiteOrigin } from "@/lib/site-url";

describe("getPublicSiteOrigin", () => {
  it("prefers x-forwarded headers over bind address", () => {
    const request = new NextRequest("http://0.0.0.0:3000/auth/callback", {
      headers: {
        host: "0.0.0.0:3000",
        "x-forwarded-host": "baiolo.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(getPublicSiteOrigin(request)).toBe("https://baiolo.com");
  });

  it("falls back to BAIOLO_DOMAIN when host is a bind address", () => {
    const prev = process.env.BAIOLO_DOMAIN;
    process.env.BAIOLO_DOMAIN = "baiolo.com";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SITE_URL;

    const request = new NextRequest("http://0.0.0.0:3000/auth/callback", {
      headers: { host: "0.0.0.0:3000" },
    });
    expect(getPublicSiteOrigin(request)).toBe("https://baiolo.com");

    process.env.BAIOLO_DOMAIN = prev;
  });
});

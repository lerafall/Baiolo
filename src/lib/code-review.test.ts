import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { reviewLinkPackage, reviewZipBytes } from "@/lib/code-review";

describe("reviewZipBytes", () => {
  it("flags missing index.html", async () => {
    const zip = new JSZip();
    zip.file("readme.txt", "hi");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const result = await reviewZipBytes(bytes);
    expect(result.ok).toBe(false);
    expect(result.hasIndexHtml).toBe(false);
  });

  it("passes a tiny valid package", async () => {
    const zip = new JSZip();
    zip.file(
      "index.html",
      "<!doctype html><html><body><h1>Hi</h1><script src='game.js'></script></body></html>",
    );
    zip.file("game.js", "console.log('ok');");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const result = await reviewZipBytes(bytes, {
      title: "Tiny",
      description: "Friendly demo",
    });
    expect(result.ok).toBe(true);
    expect(result.hasIndexHtml).toBe(true);
  });
});

describe("reviewLinkPackage", () => {
  it("requires https", () => {
    expect(reviewLinkPackage("http://example.com").ok).toBe(false);
    expect(reviewLinkPackage("https://example.com").ok).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { fileName } from "@/app/_home/qr-code";

describe("QR download file name", () => {
  it("uses the handle, video ID or code", () => {
    expect(fileName("https://ytopen.vercel.app/@owaistherealtor?sub=1")).toBe(
      "ytopen-owaistherealtor-qr"
    );
    expect(fileName("https://ytopen.vercel.app/v/dQw4w9WgXcQ")).toBe("ytopen-dQw4w9WgXcQ-qr");
    expect(fileName("https://ytopen.vercel.app/s/a1b2c3d4")).toBe("ytopen-a1b2c3d4-qr");
  });

  it("falls back to a plain name", () => {
    expect(fileName("not a url")).toBe("ytopen-qr");
    expect(fileName("https://ytopen.vercel.app/")).toBe("ytopen-qr");
  });
});

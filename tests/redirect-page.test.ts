import { describe, it, expect } from "vitest";
import {
  renderRedirectPage,
  renderFallbackPage,
  htmlResponse,
} from "@/lib/redirect-page";
import type { Target } from "@/lib/youtube";

const videoT: Target = { kind: "video", id: "dQw4w9WgXcQ" };

describe("renderRedirectPage", () => {
  const html = renderRedirectPage(videoT);

  it("embeds all three target URLs", () => {
    expect(html).toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(html).toContain("vnd.youtube://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(html).toContain("intent://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("has the manual fallback link and iOS timer", () => {
    expect(html).toContain("Tap here if nothing happens");
    expect(html).toContain("setTimeout");
    expect(html).toContain("pagehide");
  });

  it("is small", () => {
    expect(html.length).toBeLessThan(2048);
  });

  it("passes sub through to the URLs", () => {
    const subHtml = renderRedirectPage({ kind: "channel", id: "@MrBeast" }, true);
    expect(subHtml).toContain("sub_confirmation=1");
  });

  it("renders the fallback page for an unvalidated Target (defense-in-depth)", () => {
    const evil = { kind: "video", id: "x</script><script>alert(1)</script>" } as Target;
    const html = renderRedirectPage(evil);
    expect(html).not.toContain("alert(1)");
    expect(html).toContain("https://www.youtube.com");
  });
});

describe("renderFallbackPage", () => {
  it("links to youtube.com", () => {
    expect(renderFallbackPage()).toContain("https://www.youtube.com");
  });
});

describe("htmlResponse", () => {
  it("sets content type and edge cache headers", async () => {
    const res = htmlResponse("<p>hi</p>");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
    expect(await res.text()).toBe("<p>hi</p>");
  });
});

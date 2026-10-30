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

  it("has the manual fallback link", () => {
    expect(html).toContain("Tap here if nothing happens");
  });

  it("is small", () => {
    expect(html.length).toBeLessThan(2560);
  });

  it("has Open Graph tags with the video thumbnail", () => {
    expect(html).toContain('property="og:title" content="Watch on YouTube"');
    expect(html).toContain(
      'property="og:image" content="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"'
    );
    expect(html).toContain(
      'property="og:url" content="https://www.youtube.com/watch?v=dQw4w9WgXcQ"'
    );
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it("has Open Graph tags without an image for channels", () => {
    const chanHtml = renderRedirectPage({ kind: "channel", id: "@MrBeast" });
    expect(chanHtml).toContain(
      'property="og:title" content="Open channel on YouTube"'
    );
    expect(chanHtml).not.toContain("og:image");
    expect(chanHtml).not.toContain("twitter:card");
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

/** Runs the page's inline script against a fake browser and reports where it navigated. */
function runHandoff(html: string, ua: string, maxTouchPoints = 0) {
  const script = html.match(/<script>([\s\S]*)<\/script>/)![1];
  const nav: {
    href?: string;
    replaced?: string;
    fallback?: () => void;
    cancelled: boolean;
    listeners: Record<string, () => void>;
  } = { cancelled: false, listeners: {} };
  const listen = (type: string, fn: () => void) => { nav.listeners[type] = fn; };
  const location = {
    set href(v: string) { nav.href = v; },
    replace(v: string) { nav.replaced = v; },
  };
  new Function("navigator", "location", "document", "window", "setTimeout", "clearTimeout", script)(
    { userAgent: ua, maxTouchPoints },
    location,
    { addEventListener: listen, hidden: true },
    { addEventListener: listen },
    (fn: () => void) => { nav.fallback = fn; return 1; },
    () => { nav.cancelled = true; }
  );
  return nav;
}

describe("client handoff", () => {
  const html = renderRedirectPage(videoT);
  const IOS = "vnd.youtube://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const WEB = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";
  const MAC_UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

  it("sends Android to the intent URL", () => {
    const nav = runHandoff(html, "Mozilla/5.0 (Linux; Android 14; Pixel 8)");
    expect(nav.href).toMatch(/^intent:\/\//);
  });

  it("sends iPhone to the app with a timed fallback", () => {
    const nav = runHandoff(html, IPHONE_UA, 5);
    expect(nav.href).toBe(IOS);
    nav.fallback!();
    expect(nav.href).toBe(WEB);
  });

  it("cancels the fallback when the app takes over", () => {
    for (const event of ["pagehide", "visibilitychange"]) {
      const nav = runHandoff(html, IPHONE_UA, 5);
      nav.listeners[event]();
      expect(nav.cancelled).toBe(true);
    }
  });

  it("sends an iPad with a desktop-class UA to the app", () => {
    const nav = runHandoff(html, MAC_UA, 5);
    expect(nav.href).toBe(IOS);
    expect(nav.fallback).toBeDefined();
  });

  it("keeps a real Mac on the web", () => {
    const nav = runHandoff(html, MAC_UA, 0);
    expect(nav.replaced).toBe(WEB);
    expect(nav.href).toBeUndefined();
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
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(await res.text()).toBe("<p>hi</p>");
  });

  it("accepts a cache-control override", () => {
    const res = htmlResponse("<p>hi</p>", "no-store");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});

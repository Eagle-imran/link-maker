import {
  type Target,
  webUrl,
  iosUrl,
  androidIntentUrl,
  VIDEO_ID_RE,
  HANDLE_RE,
  CHANNEL_ID_RE,
} from "./youtube";

const PAGE_STYLE =
  "body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;gap:12px;background:#0f0f0f;color:#fff}a{color:#3ea6ff}";

/**
 * Hand-written minimal HTML — deliberately not a React page so the
 * redirect hot path ships ~1 KB with zero framework JS.
 */
export function renderRedirectPage(target: Target, sub = false): string {
  // Defense-in-depth: re-validate target.id
  const { id } = target;
  const isValid =
    (target.kind === "video" && VIDEO_ID_RE.test(id)) ||
    (target.kind === "channel" &&
      (HANDLE_RE.test(id) || CHANNEL_ID_RE.test(id)));

  if (!isValid) {
    return renderFallbackPage();
  }

  const web = webUrl(target, sub);
  const ios = iosUrl(target, sub);
  const intent = androidIntentUrl(target, sub);

  const script =
    `(function(){var ua=navigator.userAgent,web=${JSON.stringify(web)};` +
    `if(/Android/i.test(ua)){location.href=${JSON.stringify(intent)};}` +
    `else if(/iPhone|iPad|iPod/.test(ua)){` +
    `var t=setTimeout(function(){location.href=web;},1500);` +
    `var c=function(){clearTimeout(t);};` +
    `document.addEventListener("visibilitychange",function(){if(document.hidden)c();});` +
    // Transient backgrounding (notification shade, app switcher peek) cancels the auto-fallback;
    // the manual link is the escape hatch.
    `window.addEventListener("pagehide",c);` +
    `location.href=${JSON.stringify(ios)};}` +
    `else{location.replace(web);}})();`;

  // Open Graph tags so links pasted in WhatsApp/iMessage/Discord get a real
  // preview. Video thumbnails are predictable — no API needed.
  const ogTitle = target.kind === "video" ? "Watch on YouTube" : "Open channel on YouTube";
  const og =
    `<meta property="og:title" content="${ogTitle}">` +
    `<meta property="og:description" content="Opens in the YouTube app — subscribe, like, and comment.">` +
    `<meta property="og:url" content="${web}">` +
    (target.kind === "video"
      ? `<meta property="og:image" content="https://i.ytimg.com/vi/${id}/hqdefault.jpg">` +
        `<meta name="twitter:card" content="summary_large_image">`
      : "");

  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex">` +
    `<title>Opening YouTube…</title>` +
    og +
    `<style>${PAGE_STYLE}</style>` +
    `</head><body><p>Opening YouTube…</p>` +
    `<a href="${web}">Tap here if nothing happens</a>` +
    `<script>${script}</script></body></html>`
  );
}

export function renderFallbackPage(): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex">` +
    `<title>Link Maker</title>` +
    `<style>${PAGE_STYLE}</style>` +
    `</head><body><p>That link doesn&#39;t look right.</p>` +
    `<a href="https://www.youtube.com">Go to YouTube</a></body></html>`
  );
}

export function htmlResponse(
  html: string,
  cacheControl = "public, max-age=3600, s-maxage=31536000, immutable"
): Response {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Default: browser 1h, Vercel edge 1 year (content immutable per ID).
      // /s/ passes "no-store" — every click must reach the function to count.
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

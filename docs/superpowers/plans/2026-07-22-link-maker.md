# Link Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public web tool that turns YouTube URLs into smart links that escape social-app in-app browsers and open the native YouTube app.

**Architecture:** Next.js App Router on Vercel. The generator UI is a normal React page; the redirect endpoints are route handlers returning hand-written ~1 KB HTML with one inline script (no React runtime on the hot path). A pure module `lib/youtube.ts` does all URL parsing/building and is shared by both.

**Tech Stack:** Next.js 15 (App Router, TypeScript), React 19, Vitest. No database, no Tailwind, no other dependencies.

**Spec:** `docs/superpowers/specs/2026-07-22-link-maker-design.md`

---

## File structure

| File | Responsibility |
|---|---|
| `lib/youtube.ts` | Pure functions: parse any YouTube URL → `Target`; build web / iOS / Android-intent URLs from a `Target`. All ID validation regexes live here. |
| `lib/redirect-page.ts` | Render the minified redirect HTML page and the fallback page; `htmlResponse()` helper with cache headers. |
| `app/v/[id]/route.ts` | GET handler for video links. Validate → render redirect page. |
| `app/c/[handle]/route.ts` | GET handler for channel links (`?sub=1` support). Validate → render redirect page. |
| `app/page.tsx` | Generator UI (client component): paste URL → smart link + copy button + subscribe toggle. |
| `app/layout.tsx`, `app/globals.css` | Root layout and styles. |
| `tests/youtube.test.ts` | Unit tests for parser + builders. |
| `tests/redirect-page.test.ts` | Unit tests for HTML rendering. |
| `tests/routes.test.ts` | Unit tests for both route handlers. |
| `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore` | Scaffold. |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "link-maker",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
.next/
out/
*.tsbuildinfo
.vercel
.DS_Store
```

- [ ] **Step 5: Create `app/globals.css`**

```css
:root {
  --bg: #0f0f0f;
  --fg: #ffffff;
  --muted: #aaaaaa;
  --accent: #ff0033;
  --card: #1c1c1c;
  --link: #3ea6ff;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--fg);
}
```

- [ ] **Step 6: Create `app/layout.tsx`**

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Link Maker — open YouTube links in the app",
  description:
    "Turn any YouTube link into a smart link that opens the YouTube app instead of the in-app browser. More subscribers, more engagement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create placeholder `app/page.tsx`** (replaced in Task 7)

```tsx
export default function Home() {
  return <main>Link Maker</main>;
}
```

- [ ] **Step 8: Install and verify build**

Run: `npm install && npm run build`
Expected: build completes with `✓ Compiled successfully` and a route table listing `/`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest"
```

---

### Task 2: URL parser (`parseYouTubeUrl`)

**Files:**
- Create: `lib/youtube.ts`
- Test: `tests/youtube.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/youtube.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseYouTubeUrl } from "@/lib/youtube";

const VID = "dQw4w9WgXcQ";

describe("parseYouTubeUrl — videos", () => {
  it.each([
    [`https://www.youtube.com/watch?v=${VID}`],
    [`http://youtube.com/watch?v=${VID}`],
    [`https://m.youtube.com/watch?v=${VID}&t=42s`],
    [`https://music.youtube.com/watch?v=${VID}`],
    [`https://youtu.be/${VID}`],
    [`https://youtu.be/${VID}?si=abc123`],
    [`https://www.youtube.com/shorts/${VID}`],
    [`https://www.youtube.com/live/${VID}`],
    [`youtube.com/watch?v=${VID}`], // no scheme
    [`  https://youtu.be/${VID}  `], // whitespace
  ])("parses %s", (input) => {
    expect(parseYouTubeUrl(input)).toEqual({ kind: "video", id: VID });
  });
});

describe("parseYouTubeUrl — channels", () => {
  it("parses @handle URLs", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/@MrBeast")).toEqual({
      kind: "channel",
      id: "@MrBeast",
    });
  });

  it("parses channel-ID URLs", () => {
    const id = "UCX6OQ3DkcsbYNE6H8uQQuVA";
    expect(parseYouTubeUrl(`https://youtube.com/channel/${id}`)).toEqual({
      kind: "channel",
      id,
    });
  });
});

describe("parseYouTubeUrl — rejects", () => {
  it.each([
    [""],
    ["   "],
    ["not a url at all"],
    ["https://vimeo.com/12345"],
    ["https://evil.com/watch?v=dQw4w9WgXcQ"],
    ["https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=too_short"],
    ["https://www.youtube.com/watch?v=way_too_long_for_an_id"],
    ["https://www.youtube.com/watch"], // no v param
    ["https://www.youtube.com/"],
    ["https://www.youtube.com/@x"], // handle too short (<3)
    ["https://www.youtube.com/channel/notAChannelId"],
    ["https://www.youtube.com/playlist?list=PL123"],
  ])("returns null for %s", (input) => {
    expect(parseYouTubeUrl(input)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/youtube`.

- [ ] **Step 3: Implement the parser**

Create `lib/youtube.ts`:

```ts
export type Target =
  | { kind: "video"; id: string }
  | { kind: "channel"; id: string }; // id is "@handle" or "UC..." channel ID

export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
export const HANDLE_RE = /^@[A-Za-z0-9._-]{3,30}$/;
export const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;

const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);

export function parseYouTubeUrl(input: string): Target | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const segs = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") return video(segs[0]);
  if (!YT_HOSTS.has(host)) return null;

  if (segs[0] === "watch") return video(url.searchParams.get("v") ?? undefined);
  if (segs[0] === "shorts" || segs[0] === "live") return video(segs[1]);
  if (segs[0] === "channel") return channel(segs[1]);
  if (segs[0]?.startsWith("@")) return channel(segs[0]);
  return null;
}

function video(id: string | undefined): Target | null {
  return id && VIDEO_ID_RE.test(id) ? { kind: "video", id } : null;
}

function channel(id: string | undefined): Target | null {
  if (!id) return null;
  return HANDLE_RE.test(id) || CHANNEL_ID_RE.test(id)
    ? { kind: "channel", id }
    : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all `parseYouTubeUrl` tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/youtube.ts tests/youtube.test.ts
git commit -m "feat: YouTube URL parser with strict ID validation"
```

---

### Task 3: Deep-link builders

**Files:**
- Modify: `lib/youtube.ts` (append)
- Test: `tests/youtube.test.ts` (append)

- [ ] **Step 1: Write the failing tests** — append to `tests/youtube.test.ts`:

```ts
import { webUrl, iosUrl, androidIntentUrl, type Target } from "@/lib/youtube";

const videoT: Target = { kind: "video", id: VID };
const handleT: Target = { kind: "channel", id: "@MrBeast" };
const chanIdT: Target = { kind: "channel", id: "UCX6OQ3DkcsbYNE6H8uQQuVA" };

describe("deep-link builders", () => {
  it("builds web URLs", () => {
    expect(webUrl(videoT)).toBe(`https://www.youtube.com/watch?v=${VID}`);
    expect(webUrl(handleT)).toBe("https://www.youtube.com/@MrBeast");
    expect(webUrl(chanIdT)).toBe(
      "https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA"
    );
  });

  it("appends sub_confirmation for channels when sub=true", () => {
    expect(webUrl(handleT, true)).toBe(
      "https://www.youtube.com/@MrBeast?sub_confirmation=1"
    );
  });

  it("ignores sub for videos", () => {
    expect(webUrl(videoT, true)).toBe(`https://www.youtube.com/watch?v=${VID}`);
  });

  it("builds iOS URLs by swapping the scheme", () => {
    expect(iosUrl(videoT)).toBe(`vnd.youtube://www.youtube.com/watch?v=${VID}`);
    expect(iosUrl(handleT, true)).toBe(
      "vnd.youtube://www.youtube.com/@MrBeast?sub_confirmation=1"
    );
  });

  it("builds Android intent URLs with an encoded fallback", () => {
    expect(androidIntentUrl(videoT)).toBe(
      `intent://www.youtube.com/watch?v=${VID}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${VID}`
      )};end`
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `webUrl` is not exported.

- [ ] **Step 3: Implement** — append to `lib/youtube.ts`:

```ts
export function webUrl(t: Target, sub = false): string {
  return `https://www.youtube.com${ytPath(t, sub)}`;
}

export function iosUrl(t: Target, sub = false): string {
  return `vnd.youtube://www.youtube.com${ytPath(t, sub)}`;
}

export function androidIntentUrl(t: Target, sub = false): string {
  return (
    `intent://www.youtube.com${ytPath(t, sub)}` +
    `#Intent;scheme=https;package=com.google.android.youtube` +
    `;S.browser_fallback_url=${encodeURIComponent(webUrl(t, sub))};end`
  );
}

function ytPath(t: Target, sub: boolean): string {
  if (t.kind === "video") return `/watch?v=${t.id}`;
  const base = t.id.startsWith("@") ? `/${t.id}` : `/channel/${t.id}`;
  return sub ? `${base}?sub_confirmation=1` : base;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/youtube.ts tests/youtube.test.ts
git commit -m "feat: web/iOS/Android deep-link builders"
```

---

### Task 4: Redirect page renderer

**Files:**
- Create: `lib/redirect-page.ts`
- Test: `tests/redirect-page.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/redirect-page.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/redirect-page`.

- [ ] **Step 3: Implement**

Create `lib/redirect-page.ts`:

```ts
import { type Target, webUrl, iosUrl, androidIntentUrl } from "./youtube";

/**
 * Hand-written minimal HTML — deliberately not a React page so the
 * redirect hot path ships ~1 KB with zero framework JS.
 */
export function renderRedirectPage(target: Target, sub = false): string {
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
    `window.addEventListener("pagehide",c);` +
    `location.href=${JSON.stringify(ios)};}` +
    `else{location.replace(web);}})();`;

  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex">` +
    `<title>Opening YouTube…</title>` +
    `<style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;gap:12px;background:#0f0f0f;color:#fff}a{color:#3ea6ff}</style>` +
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
    `<style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;gap:12px;background:#0f0f0f;color:#fff}a{color:#3ea6ff}</style>` +
    `</head><body><p>That link doesn&#39;t look right.</p>` +
    `<a href="https://www.youtube.com">Go to YouTube</a></body></html>`
  );
}

export function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Browser caches 1h; Vercel edge caches 1 year (content is immutable per ID).
      "Cache-Control": "public, max-age=3600, s-maxage=31536000, immutable",
    },
  });
}
```

Note on embedding safety: URLs are built exclusively from regex-validated IDs (`[A-Za-z0-9_-@.]` charsets — no `"`, `<`, `>`, `&`), so direct interpolation into HTML and `JSON.stringify` into JS are both safe here.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/redirect-page.ts tests/redirect-page.test.ts
git commit -m "feat: redirect + fallback page renderers with edge cache headers"
```

---

### Task 5: Video route handler

**Files:**
- Create: `app/v/[id]/route.ts`
- Test: `tests/routes.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/routes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { GET as videoGET } from "@/app/v/[id]/route";

const VID = "dQw4w9WgXcQ";

function videoReq(id: string) {
  return videoGET(new Request(`http://localhost/v/${id}`), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /v/[id]", () => {
  it("returns the redirect page for a valid ID", async () => {
    const res = await videoReq(VID);
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
    expect(body).toContain(`intent://www.youtube.com/watch?v=${VID}`);
    expect(body).toContain(`vnd.youtube://www.youtube.com/watch?v=${VID}`);
  });

  it("returns the fallback page for an invalid ID", async () => {
    const res = await videoReq("<script>alert(1)</script>");
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).not.toContain("<script>alert(1)</script>");
    expect(body).toContain("https://www.youtube.com");
    expect(body).not.toContain("intent://");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/app/v/[id]/route`.

- [ ] **Step 3: Implement**

Create `app/v/[id]/route.ts`:

```ts
import { VIDEO_ID_RE } from "@/lib/youtube";
import {
  renderRedirectPage,
  renderFallbackPage,
  htmlResponse,
} from "@/lib/redirect-page";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!VIDEO_ID_RE.test(id)) return htmlResponse(renderFallbackPage());
  return htmlResponse(renderRedirectPage({ kind: "video", id }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/v tests/routes.test.ts
git commit -m "feat: /v/[id] video redirect endpoint"
```

---

### Task 6: Channel route handler

**Files:**
- Create: `app/c/[handle]/route.ts`
- Test: `tests/routes.test.ts` (append)

- [ ] **Step 1: Write the failing tests** — append to `tests/routes.test.ts`:

```ts
import { GET as channelGET } from "@/app/c/[handle]/route";

function channelReq(handle: string, query = "") {
  return channelGET(
    new Request(`http://localhost/c/${encodeURIComponent(handle)}${query}`),
    { params: Promise.resolve({ handle: encodeURIComponent(handle) }) }
  );
}

describe("GET /c/[handle]", () => {
  it("returns the redirect page for an @handle (URL-encoded in path)", async () => {
    const res = await channelReq("@MrBeast");
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toContain("vnd.youtube://www.youtube.com/@MrBeast");
    expect(body).not.toContain("sub_confirmation");
  });

  it("returns the redirect page for a UC channel ID", async () => {
    const res = await channelReq("UCX6OQ3DkcsbYNE6H8uQQuVA");
    const body = await res.text();
    expect(body).toContain("/channel/UCX6OQ3DkcsbYNE6H8uQQuVA");
  });

  it("adds sub_confirmation when ?sub=1", async () => {
    const res = await channelReq("@MrBeast", "?sub=1");
    const body = await res.text();
    expect(body).toContain("sub_confirmation=1");
  });

  it("returns the fallback page for garbage", async () => {
    const res = await channelReq("not-a-handle");
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).not.toContain("vnd.youtube://");
  });

  it("survives malformed percent-encoding", async () => {
    const res = await channelGET(new Request("http://localhost/c/%E0%A4%A"), {
      params: Promise.resolve({ handle: "%E0%A4%A" }),
    });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/app/c/[handle]/route`.

- [ ] **Step 3: Implement**

Create `app/c/[handle]/route.ts`:

```ts
import { HANDLE_RE, CHANNEL_ID_RE } from "@/lib/youtube";
import {
  renderRedirectPage,
  renderFallbackPage,
  htmlResponse,
} from "@/lib/redirect-page";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle: raw } = await params;

  let handle: string;
  try {
    handle = decodeURIComponent(raw); // "@" arrives as "%40"
  } catch {
    return htmlResponse(renderFallbackPage());
  }

  if (!HANDLE_RE.test(handle) && !CHANNEL_ID_RE.test(handle)) {
    return htmlResponse(renderFallbackPage());
  }

  const sub = new URL(req.url).searchParams.get("sub") === "1";
  return htmlResponse(renderRedirectPage({ kind: "channel", id: handle }, sub));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 5: Commit**

```bash
git add app/c tests/routes.test.ts
git commit -m "feat: /c/[handle] channel redirect endpoint with sub prompt"
```

---

### Task 7: Generator UI

**Files:**
- Modify: `app/page.tsx` (replace placeholder)
- Modify: `app/globals.css` (append)

No unit tests for this task — it's a thin view over the already-tested parser. Verification is manual via dev server (Step 3).

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { parseYouTubeUrl } from "@/lib/youtube";

export default function Home() {
  const [input, setInput] = useState("");
  const [sub, setSub] = useState(false);
  const [copied, setCopied] = useState(false);

  const target = useMemo(() => parseYouTubeUrl(input), [input]);
  const showError = input.trim() !== "" && target === null;

  const link = useMemo(() => {
    if (!target) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return target.kind === "video"
      ? `${origin}/v/${target.id}`
      : `${origin}/c/${target.id}${sub ? "?sub=1" : ""}`;
  }, [target, sub]);

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="wrap">
      <h1>Link Maker</h1>
      <p className="tagline">
        Turn any YouTube link into one that opens the <strong>YouTube app</strong>{" "}
        — not the in-app browser. Viewers stay logged in, so they can actually
        subscribe, like, and comment.
      </p>

      <label className="field">
        <span>Paste a YouTube link</span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://youtube.com/watch?v=... or youtube.com/@yourchannel"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
      </label>

      {showError && (
        <p className="error">That doesn&apos;t look like a YouTube link.</p>
      )}

      {target?.kind === "channel" && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={sub}
            onChange={(e) => setSub(e.target.checked)}
          />
          <span>Show the subscribe prompt when it opens</span>
        </label>
      )}

      {target && (
        <div className="result">
          <code>{link}</code>
          <button onClick={copy}>{copied ? "Copied!" : "Copy"}</button>
        </div>
      )}

      <footer>
        Free · no tracking · works on Instagram, TikTok &amp; more
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Append to `app/globals.css`**

```css
.wrap {
  max-width: 560px;
  margin: 0 auto;
  padding: 48px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

h1 { margin: 0; font-size: 2rem; }

.tagline { margin: 0; color: var(--muted); line-height: 1.5; }

.field { display: flex; flex-direction: column; gap: 8px; }
.field span { font-size: 0.9rem; color: var(--muted); }

.field input {
  padding: 14px 16px;
  font-size: 1rem;
  border-radius: 10px;
  border: 1px solid #333;
  background: var(--card);
  color: var(--fg);
  outline: none;
}
.field input:focus { border-color: var(--accent); }

.error { margin: 0; color: #ff6b6b; font-size: 0.9rem; }

.toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.toggle input { accent-color: var(--accent); width: 18px; height: 18px; }

.result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--card);
  border: 1px solid #333;
  border-radius: 10px;
}
.result code {
  flex: 1;
  overflow-wrap: anywhere;
  font-size: 0.95rem;
  color: var(--link);
}
.result button {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

footer { color: var(--muted); font-size: 0.85rem; text-align: center; margin-top: 12px; }
```

- [ ] **Step 3: Manual verification with dev server**

Run: `npm run dev`, open `http://localhost:3000` and check:
- Paste `https://youtu.be/dQw4w9WgXcQ` → link `http://localhost:3000/v/dQw4w9WgXcQ` appears; Copy works.
- Paste `https://www.youtube.com/@MrBeast` → subscribe toggle appears; checking it appends `?sub=1`.
- Paste `hello` → inline error appears; no link shown.
- Open `http://localhost:3000/v/dQw4w9WgXcQ` in a desktop browser → instantly lands on the YouTube video.
- Open `http://localhost:3000/v/badid` → "That link doesn't look right." page.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: generator UI with copy button and subscribe toggle"
```

---

### Task 8: Final verification + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Full test + build run**

Run: `npm test && npm run build`
Expected: all tests PASS; build succeeds with routes `/`, `/v/[id]`, `/c/[handle]` in the output table.

- [ ] **Step 2: Create `README.md`**

```markdown
# Link Maker

Turn any YouTube link into a smart link that opens the **native YouTube app**
instead of a social app's in-app browser (Instagram, TikTok, …). Viewers stay
logged in, so they can subscribe, like, and comment.

## How it works

- `/{v}/{videoId}` and `/c/{@handle|channelId}` serve a ~1 KB HTML page with one
  inline script — no framework JS on the redirect hot path.
- **Android:** `intent://` URL targeting the YouTube package, with a built-in
  browser fallback.
- **iOS:** `vnd.youtube://` scheme with a 1.5 s timer fallback to the web URL,
  cancelled if the app takes over.
- **Desktop:** immediate redirect to youtube.com.
- `?sub=1` on channel links adds YouTube's subscribe-confirmation prompt.

No accounts, no tracking, no database.

## Develop

    npm install
    npm run dev    # http://localhost:3000
    npm test       # Vitest unit tests
    npm run build  # production build

## Deploy

Push to a Git repo and import into [Vercel](https://vercel.com) — zero config.
After deploying, test links from the Instagram in-app browser on iOS and
Android (paste a smart link into your own story/bio).
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README"
```

---

## Post-deploy manual device matrix (outside this plan's automation)

| Environment | Expected |
|---|---|
| Instagram in-app browser, iOS | YouTube app opens; if not installed, web YouTube after ~1.5 s |
| Instagram in-app browser, Android | YouTube app opens via intent; browser fallback if missing |
| TikTok in-app browser | Same as above |
| Mobile Safari / Chrome | App opens (or web fallback) |
| Desktop browser | Instant redirect to youtube.com |

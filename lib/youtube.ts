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

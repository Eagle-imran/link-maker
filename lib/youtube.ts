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

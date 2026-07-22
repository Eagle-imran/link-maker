import { parseYouTubeUrl } from "@/lib/youtube";
import { createLink, checkRateLimit } from "@/lib/links";
import { getRedis } from "@/lib/redis";

// Vercel overwrites x-forwarded-for (clients cannot spoof it there). Behind a
// different proxy this becomes attacker-controllable — acceptable here because
// the rate limiter is anti-abuse, not a security boundary.
function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url =
    typeof (body as { url?: unknown })?.url === "string"
      ? (body as { url: string }).url
      : "";
  const sub = (body as { sub?: unknown })?.sub === true;

  const target = parseYouTubeUrl(url);
  if (!target) {
    return Response.json(
      { error: "That doesn't look like a YouTube link." },
      { status: 400 }
    );
  }

  const redis = getRedis();
  try {
    if (!(await checkRateLimit(redis, clientIp(req)))) {
      return Response.json(
        { error: "Rate limit reached — try again in an hour." },
        { status: 429 }
      );
    }
    const { code, statsKey } = await createLink(redis, target, sub);
    const origin = new URL(req.url).origin;
    return Response.json({
      code,
      shortUrl: `${origin}/s/${code}`,
      statsUrl: `${origin}/s/${code}/stats?key=${statsKey}`,
    });
  } catch {
    return Response.json(
      { error: "Tracking is unavailable right now — try an untracked link." },
      { status: 503 }
    );
  }
}

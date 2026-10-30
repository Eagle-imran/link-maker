import { HANDLE_RE } from "@/lib/youtube";
import { renderCard } from "@/lib/og-card";

/** Share image for channel links: GET /og?c=@handle. Anything that isn't a
 * valid handle (including UC… channel IDs) gets a generic card. */
export async function GET(req: Request) {
  const handle = new URL(req.url).searchParams.get("c") ?? "";
  const res = HANDLE_RE.test(handle)
    ? await renderCard(handle, "Tap to open in the YouTube app")
    : await renderCard("Open on YouTube", "Tap to open in the YouTube app");
  // Same handle always draws the same card: cache it like the redirect pages.
  res.headers.set("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
  return res;
}

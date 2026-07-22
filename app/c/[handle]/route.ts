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

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

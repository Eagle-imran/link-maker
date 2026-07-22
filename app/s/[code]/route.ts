import type { Target } from "@/lib/youtube";
import { getLink, recordClick, classifyDevice, type StoredLink } from "@/lib/links";
import { getRedis } from "@/lib/redis";
import { deferOrRun } from "@/lib/defer";
import {
  renderRedirectPage,
  renderFallbackPage,
  htmlResponse,
} from "@/lib/redirect-page";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  let link: StoredLink | null = null;
  try {
    link = await getLink(getRedis(), code);
  } catch {
    link = null; // redis down: redirecting beats counting
  }
  if (!link) return htmlResponse(renderFallbackPage(), "no-store");

  const device = classifyDevice(req.headers.get("user-agent"));
  await deferOrRun(() => recordClick(getRedis(), code, device));

  const target: Target = { kind: link.kind, id: link.id };
  return htmlResponse(renderRedirectPage(target, link.sub), "no-store");
}

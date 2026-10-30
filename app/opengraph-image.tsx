import { renderCard, OG_SIZE } from "@/lib/og-card";

export const alt = "ytopen: YouTube links that open in the YouTube app";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderCard(
    "Your bio link is losing subscribers.",
    "Make YouTube links that open in the app",
    76
  );
}

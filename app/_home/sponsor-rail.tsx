/** Sponsor tiles are off unless NEXT_PUBLIC_SPONSORS is "on" when the site is
 * built. On Vercel: set it under Settings → Environment Variables, then redeploy. */
export const SPONSORS_ON = process.env.NEXT_PUBLIC_SPONSORS === "on";

/** Sponsor slots per side. Blank for now; fill a slot by giving it content. */
const SLOTS = 3;

/** A column of sponsor tiles beside the page, shown on wide screens only. */
export function SponsorRail({ side }: { side: "left" | "right" }) {
  return (
    <aside className={`rail rail-${side}`} aria-hidden="true">
      {Array.from({ length: SLOTS }, (_, i) => (
        <div key={i} className="sponsor-tile" />
      ))}
    </aside>
  );
}

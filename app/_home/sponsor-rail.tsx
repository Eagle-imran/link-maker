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

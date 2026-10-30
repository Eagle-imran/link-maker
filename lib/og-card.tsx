import { ImageResponse } from "next/og";
import { LogoMark } from "@/app/brand";

export const OG_SIZE = { width: 1200, height: 630 };

// Instrument Sans (the site's typeface) from Google Fonts. Without a modern
// User-Agent the CSS API serves TTF, which is what next/og can read. If the
// fetch fails the card still renders in next/og's built-in font.
async function loadFont(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@${weight}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** The 1200×630 share card: logo top-left, a big title, a quieter line under it.
 * Without `titleSize`, the title is sized to fit one line (handles are ≤31 characters). */
export async function renderCard(
  title: string,
  subtitle: string,
  titleSize?: number
): Promise<ImageResponse> {
  const [semibold, regular] = await Promise.all([loadFont(600), loadFont(400)]);
  const fonts = [
    ...(semibold ? [{ name: "Instrument Sans", data: semibold, weight: 600 as const }] : []),
    ...(regular ? [{ name: "Instrument Sans", data: regular, weight: 400 as const }] : []),
  ];
  const size =
    titleSize ?? (title.length > 24 ? 64 : title.length > 18 ? 80 : title.length > 14 ? 96 : 120);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#f4f4f1",
          backgroundColor: "#000",
          backgroundImage: "radial-gradient(120% 60% at 50% -10%, #1d1d22 0%, #000 70%)",
          fontFamily: fonts.length ? "Instrument Sans" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <LogoMark size={64} />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600 }}>
            <span style={{ color: "#8b8b92" }}>yt</span>open
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
          <div
            style={{
              fontSize: size,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 40, color: "#c4c4ca" }}>{subtitle}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}

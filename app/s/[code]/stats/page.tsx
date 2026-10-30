import type { Metadata } from "next";
import { getRedis } from "@/lib/redis";
import { getLink, getStats, buildDailySeries, type LinkStats } from "@/lib/links";
import { webUrl, type Target, VIDEO_ID_RE, HANDLE_RE, CHANNEL_ID_RE } from "@/lib/youtube";
import { Brand } from "@/app/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false } };

function NotFound() {
  return (
    <main className="wrap">
      <Brand />
      <section className="stats-hero">
        <h1>No stats found</h1>
        <p>
          Open the full stats page link, including the part after{" "}
          <span className="nowrap">?key=</span>. You can find it under Your links
          on the device where you made the link.
        </p>
      </section>
    </main>
  );
}

export default async function StatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { code } = await params;
  const { key } = await searchParams;

  let link = null;
  try {
    link = await getLink(getRedis(), code);
  } catch {}
  if (!link || typeof key !== "string" || key !== link.statsKey) {
    return <NotFound />;
  }

  const validId =
    typeof link.id === "string" &&
    (link.kind === "video"
      ? VIDEO_ID_RE.test(link.id)
      : link.kind === "channel" &&
        (HANDLE_RE.test(link.id) || CHANNEL_ID_RE.test(link.id)));
  if (!validId) return <NotFound />;

  let stats: LinkStats | null = null;
  try {
    stats = await getStats(getRedis(), code);
  } catch {
    stats = null;
  }
  if (!stats) {
    return (
      <main className="wrap">
        <Brand />
        <section className="stats-hero">
          <h1>Stats are unavailable</h1>
          <p>Your link still works. Reload this page in a minute to see clicks.</p>
        </section>
      </main>
    );
  }

  const series = buildDailySeries(stats.daily, 30);
  const max = Math.max(1, ...series.map((d) => d.count));
  const target: Target = { kind: link.kind, id: link.id };
  const targetUrl = webUrl(target, link.sub);

  const label =
    target.kind === "video" ? "Video" : link.sub ? `${link.id}, with subscribe prompt` : link.id;

  return (
    <main className="wrap">
      <Brand />

      <section className="stats-hero">
        <h1>Clicks</h1>
        <p>
          On /s/{code}, which opens{" "}
          <a href={targetUrl} rel="noreferrer">
            {label === "Video" ? targetUrl.replace(/^https:\/\//, "") : label}
          </a>
        </p>
      </section>

      <p className="total">
        <strong>{stats.total.toLocaleString("en")}</strong>
        <span>{stats.total === 1 ? "click in total" : "clicks in total"}</span>
      </p>

      <section className="stat-grid" aria-label="Clicks by device">
        <div className="stat">
          <strong>{stats.devices.ios.toLocaleString("en")}</strong>
          <span>iOS</span>
        </div>
        <div className="stat">
          <strong>{stats.devices.android.toLocaleString("en")}</strong>
          <span>Android</span>
        </div>
        <div className="stat">
          <strong>{stats.devices.desktop.toLocaleString("en")}</strong>
          <span>Computer and other</span>
        </div>
      </section>

      <section className="block">
        <h2>Last 30 days</h2>
        <div>
          <div className="chart" role="img" aria-label="Clicks per day for the last 30 days">
            {series.map((d) => (
              <div key={d.date} className="bar-col" title={`${d.date}: ${d.count}`}>
                <div className="bar" style={{ height: `${(d.count / max) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="chart-labels">
            <span>{series[0].date}</span>
            <span>{series[series.length - 1].date} (UTC)</span>
          </div>
        </div>
      </section>

      <footer>Counts are totals only. Link Maker doesn&apos;t record who clicked.</footer>
    </main>
  );
}

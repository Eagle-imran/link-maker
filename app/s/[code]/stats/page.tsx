import type { Metadata } from "next";
import { getRedis } from "@/lib/redis";
import { getLink, getStats, buildDailySeries, type LinkStats } from "@/lib/links";
import { webUrl, type Target, VIDEO_ID_RE, HANDLE_RE, CHANNEL_ID_RE } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { referrer: "no-referrer", robots: { index: false } };

function NotFound() {
  return (
    <main className="wrap">
      <h1>Stats not found</h1>
      <p className="tagline">
        Check that you opened the full stats URL, including its key.
      </p>
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
        <h1>Link stats</h1>
        <p className="tagline">Stats are temporarily unavailable — try again in a minute.</p>
      </main>
    );
  }

  const series = buildDailySeries(stats.daily, 30);
  const max = Math.max(1, ...series.map((d) => d.count));
  const target: Target = { kind: link.kind, id: link.id };
  const targetUrl = webUrl(target, link.sub);

  return (
    <main className="wrap">
      <h1>Link stats</h1>
      <p className="tagline">
        <code>/s/{code}</code> → <a href={targetUrl} rel="noreferrer">{targetUrl}</a>
      </p>

      <section className="stat-grid">
        <div className="stat">
          <strong>{stats.total}</strong>
          <span>total clicks</span>
        </div>
        <div className="stat">
          <strong>{stats.devices.android}</strong>
          <span>Android</span>
        </div>
        <div className="stat">
          <strong>{stats.devices.ios}</strong>
          <span>iOS</span>
        </div>
        <div className="stat">
          <strong>{stats.devices.desktop}</strong>
          <span>Desktop</span>
        </div>
      </section>

      <section className="info">
        <h2>Last 30 days</h2>
        <div className="chart" role="img" aria-label="Daily clicks, last 30 days">
          {series.map((d) => (
            <div key={d.date} className="bar-col" title={`${d.date}: ${d.count}`}>
              <div className="bar" style={{ height: `${(d.count / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="chart-labels">
          <span>{series[0].date}</span>
          <span>{series[series.length - 1].date}</span>
        </div>
      </section>
    </main>
  );
}

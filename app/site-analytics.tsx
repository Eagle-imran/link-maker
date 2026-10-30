"use client";

import { Analytics } from "@vercel/analytics/next";

/** Vercel Web Analytics: cookieless page-view counts for the site's own pages.
 * Stats pages are skipped, since their URLs are the secret that unlocks them.
 * Redirect links never load this, so viewers who tap a link aren't counted. */
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => (new URL(event.url).pathname.startsWith("/s/") ? null : event)}
    />
  );
}

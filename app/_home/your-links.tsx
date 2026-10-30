import { bare } from "./link-result";
import type { SavedLink } from "./saved-links";

/** Tracked links this browser has made, newest first. */
export function YourLinks({
  links,
  copied,
  onCopy,
  onRemove,
}: {
  links: SavedLink[];
  copied: string | null;
  onCopy: (text: string, tag: string) => void;
  onRemove: (code: string) => void;
}) {
  if (links.length === 0) return null;
  return (
    <section className="block">
      <h2>Your links</h2>
      <div>
        <ul className="mylinks">
          {links.map((l) => (
            <li key={l.code}>
              <div className="mylink-meta">
                <span className="mylink-target">{l.target}</span>
                <span className="mylink-url">{path(l.shortUrl)}</span>
              </div>
              <div className="mylink-actions">
                <button
                  type="button"
                  className="btn quiet"
                  onClick={() => onCopy(l.shortUrl, l.code)}
                >
                  {copied === l.code ? "Copied" : "Copy"}
                </button>
                <a className="btn quiet" href={l.statsUrl}>
                  Stats
                </a>
                <button
                  type="button"
                  className="remove"
                  aria-label={`Remove ${l.shortUrl} from this list`}
                  onClick={() => onRemove(l.code)}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="fine">
          Saved in this browser only. Removing a link here doesn&apos;t stop
          it working.
        </p>
      </div>
    </section>
  );
}

/** The site is the same for every saved link, so the list shows only the path. */
function path(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return bare(url);
  }
}

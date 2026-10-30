import { Fragment, useEffect, useState } from "react";
import { QrCode } from "./qr-code";

/** A finished link: label, the link itself, Copy, and optionally a QR code
 * (top right), the phone's share sheet and a "Try it" link. */
export function LinkResult({
  label,
  url,
  copied,
  onCopy,
  quiet = false,
  qr = false,
  share = false,
  tryIt = false,
}: {
  label: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
  /** Smaller text and a secondary button, for the private stats link. */
  quiet?: boolean;
  qr?: boolean;
  share?: boolean;
  /** Opens the link in a new tab. Off for tracked links, where it would count a click. */
  tryIt?: boolean;
}) {
  // Known only in the browser, so the first render matches the server's.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  function shareLink() {
    // Rejects when the viewer closes the sheet; nothing to do then.
    navigator.share({ url }).catch(() => {});
  }

  return (
    <div className={qr ? "result has-qr" : "result"}>
      <div className="result-main">
        <div className="result-head">
          <span className="result-label">{label}</span>
          {tryIt && (
            <a
              className="try-it"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Try it
            </a>
          )}
        </div>
        <div className="result-row">
          <span className={quiet ? "result-url small" : "result-url"}>
            {breakable(bare(url))}
          </span>
          <div className="result-actions">
            {share && canShare && (
              <button type="button" className="btn quiet" onClick={shareLink}>
                Share
              </button>
            )}
            <button
              type="button"
              className={quiet ? "btn quiet" : "btn"}
              onClick={onCopy}
              aria-live="polite"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
      {qr && <QrCode url={url} />}
    </div>
  );
}

/** Lets a long link wrap after a slash instead of mid-word. */
function breakable(text: string) {
  return text.split("/").map((part, i) => (
    <Fragment key={i}>
      {i > 0 && (
        <>
          /<wbr />
        </>
      )}
      {part}
    </Fragment>
  ));
}

/** Drops the protocol so links read cleanly; the copied value keeps it. */
export function bare(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

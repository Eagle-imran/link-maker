import { useEffect, useState } from "react";
import { QrCode } from "./qr-code";

/** A finished link: label, the link itself, Copy, and (optionally) a QR code. */
export function LinkResult({
  label,
  url,
  copied,
  onCopy,
  quiet = false,
  qr = false,
}: {
  label: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
  /** Smaller text and a secondary button, for the private stats link. */
  quiet?: boolean;
  qr?: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  useEffect(() => setShowQr(false), [url]);

  return (
    <div className="result">
      <span className="result-label">{label}</span>
      <div className="result-row">
        <span className={quiet ? "result-url small" : "result-url"}>{bare(url)}</span>
        <div className="result-actions">
          {qr && (
            <button
              type="button"
              className="btn quiet"
              aria-expanded={showQr}
              onClick={() => setShowQr((v) => !v)}
            >
              QR code
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
      {showQr && <QrCode url={url} />}
    </div>
  );
}

/** Drops the protocol so links read cleanly; the copied value keeps it. */
export function bare(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

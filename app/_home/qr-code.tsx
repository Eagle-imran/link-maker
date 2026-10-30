import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Dark on white with a quiet zone: what phone cameras scan most reliably.
const OPTIONS = { margin: 2, errorCorrectionLevel: "M" as const };

/** A QR code for `url`, with PNG and SVG downloads for print. */
export function QrCode({ url }: { url: string }) {
  const [svg, setSvg] = useState("");
  const [png, setPng] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all([
      QRCode.toString(url, { ...OPTIONS, type: "svg" }),
      QRCode.toDataURL(url, { ...OPTIONS, width: 1024 }),
    ])
      .then(([s, p]) => {
        if (live) {
          setSvg(s);
          setPng(p);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [url]);

  if (!svg) return null;
  const name = fileName(url);

  return (
    <div className="qr">
      <div
        className="qr-image"
        role="img"
        aria-label={`QR code for ${url}`}
        // Generated locally by the qrcode library from our own URL.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="qr-actions">
        <a className="btn quiet" href={png} download={`${name}.png`}>
          Download PNG
        </a>
        <a
          className="btn quiet"
          href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
          download={`${name}.svg`}
        >
          Download SVG
        </a>
        <p className="fine">SVG stays sharp at any size, for print.</p>
      </div>
    </div>
  );
}

/** "https://ytopen.vercel.app/@owais?sub=1" → "ytopen-owais-qr". */
export function fileName(url: string): string {
  let last = "";
  try {
    last = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {}
  const slug = last.replace(/[^A-Za-z0-9._-]/g, "");
  return slug ? `ytopen-${slug}-qr` : "ytopen-qr";
}

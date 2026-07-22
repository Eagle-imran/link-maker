"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseYouTubeUrl } from "@/lib/youtube";

export default function Home() {
  const [input, setInput] = useState("");
  const [sub, setSub] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const target = useMemo(() => parseYouTubeUrl(input), [input]);
  const showError = input.trim() !== "" && target === null;

  const link = useMemo(() => {
    if (!target) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return target.kind === "video"
      ? `${origin}/v/${target.id}`
      : `${origin}/c/${target.id}${sub ? "?sub=1" : ""}`;
  }, [target, sub]);

  useEffect(() => {
    setCopied(false);
    clearTimeout(copyTimer.current);
    return () => clearTimeout(copyTimer.current);
  }, [link]);

  async function copy() {
    let ok = true;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Restricted contexts (in-app browsers): legacy fallback
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy");
      ta.remove();
    }
    if (!ok) return;
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="wrap">
      <h1>Link Maker</h1>
      <p className="tagline">
        Turn any YouTube link into one that opens the <strong>YouTube app</strong>{" "}
        — not the in-app browser. Viewers stay logged in, so they can actually
        subscribe, like, and comment.
      </p>

      <label className="field">
        <span>Paste a YouTube link</span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://youtube.com/watch?v=... or youtube.com/@yourchannel"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          aria-invalid={showError}
          aria-describedby={showError ? "url-error" : undefined}
        />
      </label>

      {showError && (
        <p className="error" id="url-error" role="alert">
          That doesn&apos;t look like a YouTube link.
        </p>
      )}

      {target?.kind === "channel" && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={sub}
            onChange={(e) => setSub(e.target.checked)}
          />
          <span>
            Ask visitors to confirm subscribing
            <small>
              Desktop browsers only — in the YouTube app, viewers land on your
              channel with the Subscribe button
            </small>
          </span>
        </label>
      )}

      {target && (
        <div className="result">
          <code>{link}</code>
          <button type="button" onClick={copy} aria-live="polite">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      <section className="info">
        <h2>Why smart links?</h2>
        <p>
          When someone taps your YouTube link inside Instagram or TikTok, it
          opens in the app&apos;s built-in browser — where they&apos;re{" "}
          <strong>not logged in to YouTube</strong>. They can&apos;t subscribe,
          like, or comment. Most just leave.
        </p>
        <p>
          A smart link skips the in-app browser and opens your video or channel
          in the <strong>YouTube app</strong>, where viewers are already logged
          in. One tap to subscribe — more subscribers and watch time from the
          exact same clicks.
        </p>
      </section>

      <section className="info">
        <h2>How it works</h2>
        <ol>
          <li>Paste any YouTube link — video, Short, or channel</li>
          <li>Copy your smart link</li>
          <li>Use it in your bio, stories, and captions</li>
        </ol>
        <p className="fine">
          If the YouTube app isn&apos;t installed, the link falls back to
          youtube.com — nobody hits a dead end.
        </p>
      </section>

      <footer>
        Free · no tracking · works on Instagram, TikTok &amp; more
      </footer>
    </main>
  );
}

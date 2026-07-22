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
  }, [link]);

  async function copy() {
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
      document.execCommand("copy");
      ta.remove();
    }
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
          <span>Show the subscribe prompt when it opens</span>
        </label>
      )}

      {target && (
        <div className="result">
          <code>{link}</code>
          <button type="button" onClick={copy}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      <footer>
        Free · no tracking · works on Instagram, TikTok &amp; more
      </footer>
    </main>
  );
}

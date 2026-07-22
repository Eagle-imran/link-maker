"use client";

import { useMemo, useState } from "react";
import { parseYouTubeUrl } from "@/lib/youtube";

export default function Home() {
  const [input, setInput] = useState("");
  const [sub, setSub] = useState(false);
  const [copied, setCopied] = useState(false);

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

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        />
      </label>

      {showError && (
        <p className="error">That doesn&apos;t look like a YouTube link.</p>
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
          <button onClick={copy}>{copied ? "Copied!" : "Copy"}</button>
        </div>
      )}

      <footer>
        Free · no tracking · works on Instagram, TikTok &amp; more
      </footer>
    </main>
  );
}

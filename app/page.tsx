"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseYouTubeUrl } from "@/lib/youtube";

type SavedLink = {
  code: string;
  shortUrl: string;
  statsUrl: string;
  target: string;
  createdAt: string;
};

const STORAGE_KEY = "linkmaker:links";

function loadSaved(): SavedLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSaved(list: SavedLink[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {}
}

export default function Home() {
  const [input, setInput] = useState("");
  const [sub, setSub] = useState(false);
  const [track, setTrack] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ shortUrl: string; statsUrl: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedLink[]>([]);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const target = useMemo(() => parseYouTubeUrl(input), [input]);
  const showError = input.trim() !== "" && target === null;

  const link = useMemo(() => {
    if (!target) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return target.kind === "video"
      ? `${origin}/v/${target.id}`
      : `${origin}/c/${target.id}${sub ? "?sub=1" : ""}`;
  }, [target, sub]);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  useEffect(() => {
    setCopied(null);
    setCreated(null);
    setApiError(null);
    clearTimeout(copyTimer.current);
    return () => clearTimeout(copyTimer.current);
  }, [link, track]);

  async function copy(text: string, tag: string) {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Restricted contexts (in-app browsers): legacy fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy");
      ta.remove();
    }
    if (!ok) return;
    setCopied(tag);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), 1500);
  }

  async function createTracked() {
    setCreating(true);
    setApiError(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: input, sub }),
      });
      const json = await res.json();
      if (!res.ok) {
        setApiError(json.error ?? "Something went wrong — try again.");
        return;
      }
      setCreated(json);
      const code = json.shortUrl.split("/").pop() as string;
      const entry: SavedLink = {
        code,
        shortUrl: json.shortUrl,
        statsUrl: json.statsUrl,
        target:
          target!.kind === "video" ? `Video ${target!.id}` : target!.id,
        createdAt: new Date().toISOString(),
      };
      const next = [entry, ...saved.filter((l) => l.code !== code)];
      setSaved(next);
      persistSaved(next);
    } catch {
      setApiError("Network error — try again.");
    } finally {
      setCreating(false);
    }
  }

  function removeSaved(code: string) {
    const next = saved.filter((l) => l.code !== code);
    setSaved(next);
    persistSaved(next);
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
          aria-invalid={showError}
          aria-describedby={showError ? "url-error" : undefined}
          autoFocus
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
        <label className="toggle">
          <input
            type="checkbox"
            checked={track}
            onChange={(e) => setTrack(e.target.checked)}
          />
          <span>
            Track clicks
            <small>
              Creates a short link with a private stats page — total clicks,
              daily chart, device split
            </small>
          </span>
        </label>
      )}

      {target && !track && (
        <div className="result">
          <code>{link}</code>
          <button type="button" onClick={() => copy(link, "plain")} aria-live="polite">
            {copied === "plain" ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      {target && track && !created && (
        <button
          type="button"
          className="create-btn"
          onClick={createTracked}
          disabled={creating}
        >
          {creating ? "Creating…" : "Create tracked link"}
        </button>
      )}

      {apiError && (
        <p className="error" role="alert">
          {apiError}
        </p>
      )}

      {created && (
        <>
          <div className="result">
            <code>{created.shortUrl}</code>
            <button
              type="button"
              onClick={() => copy(created.shortUrl, "short")}
              aria-live="polite"
            >
              {copied === "short" ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="result">
            <code>{created.statsUrl}</code>
            <button
              type="button"
              onClick={() => copy(created.statsUrl, "stats")}
              aria-live="polite"
            >
              {copied === "stats" ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="note">
            Save the stats URL — it&apos;s the only way to see your stats.
            (It&apos;s also remembered in &ldquo;My links&rdquo; below, in this
            browser.)
          </p>
        </>
      )}

      {saved.length > 0 && (
        <section className="info">
          <h2>My links</h2>
          <p className="fine">
            Saved in this browser only — bookmark your stats URL to access it
            anywhere.
          </p>
          <ul className="mylinks">
            {saved.map((l) => (
              <li key={l.code}>
                <div className="mylink-meta">
                  <span className="mylink-target">{l.target}</span>
                  <code>{l.shortUrl}</code>
                </div>
                <div className="mylink-actions">
                  <button type="button" onClick={() => copy(l.shortUrl, l.code)}>
                    {copied === l.code ? "Copied!" : "Copy"}
                  </button>
                  <a href={l.statsUrl}>Stats</a>
                  <button
                    type="button"
                    className="remove"
                    aria-label={`Forget ${l.shortUrl}`}
                    onClick={() => removeSaved(l.code)}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
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
        Free · no visitor profiling · works on Instagram, TikTok &amp; more
      </footer>
    </main>
  );
}

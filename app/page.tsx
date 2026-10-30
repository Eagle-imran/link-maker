"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseYouTubeUrl } from "@/lib/youtube";
import { Brand, YouTubeIcon } from "./brand";

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
      : `${origin}${target.id.startsWith("@") ? "" : "/c"}/${target.id}${sub ? "?sub=1" : ""}`;
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
    let res: Response;
    try {
      res = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: input, sub }),
      });
    } catch {
      setApiError("Couldn't reach ytopen. Check your connection and try again.");
      setCreating(false);
      return;
    }
    try {
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.code) {
        setApiError(json.error ?? "Couldn't create the link. Try again in a minute.");
        return;
      }
      setCreated(json);
      const code = json.code as string;
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
      <Brand />

      <section className="hero">
        <YouTubeIcon width={56} />
        <h1>Your bio link is losing you subscribers.</h1>
        <p className="lede">
          Instagram and TikTok open YouTube links in their own browser, where
          viewers aren&apos;t signed in. Tap Subscribe and YouTube asks them to
          sign in first. Many just scroll on.
        </p>
        <p className="value">
          ytopen sends every click straight to the YouTube app, where
          viewers are already signed in. Subscribing, liking and commenting
          take one tap.
        </p>
      </section>

      <section className="maker" aria-label="Make a link">
        <label className="field">
          <span>YouTube link</span>
          <input
            type="url"
            inputMode="url"
            placeholder="Paste a video or channel link"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-invalid={showError}
            aria-describedby={showError ? "url-error" : undefined}
            autoFocus
          />
        </label>

        {showError && (
          <p className="error" id="url-error" role="alert">
            This isn&apos;t a YouTube video or channel link. Playlists aren&apos;t
            supported.
          </p>
        )}

        {target && (
          <div className="options">
            {target.kind === "channel" && (
              <label className="toggle">
                <span>
                  Ask viewers to subscribe
                  <small>
                    Shows YouTube&apos;s subscribe prompt in desktop browsers. In
                    the app, viewers land on your channel.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={sub}
                  onChange={(e) => setSub(e.target.checked)}
                />
              </label>
            )}
            <label className="toggle">
              <span>
                Track clicks
                <small>
                  Makes a short link with a private stats page: total clicks, a
                  30-day chart and the split by device.
                </small>
              </span>
              <input
                type="checkbox"
                checked={track}
                onChange={(e) => setTrack(e.target.checked)}
              />
            </label>
          </div>
        )}

        {target && !track && (
          <div className="result">
            <span className="result-label">Your link</span>
            <div className="result-row">
              <span className="result-url">{bare(link)}</span>
              <button
                type="button"
                className="btn"
                onClick={() => copy(link, "plain")}
                aria-live="polite"
              >
                {copied === "plain" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {target && track && !created && (
          <button
            type="button"
            className="btn wide"
            onClick={createTracked}
            disabled={creating}
          >
            {creating ? "Creating link…" : "Create tracked link"}
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
              <span className="result-label">Your link</span>
              <div className="result-row">
                <span className="result-url">{bare(created.shortUrl)}</span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => copy(created.shortUrl, "short")}
                  aria-live="polite"
                >
                  {copied === "short" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="result">
              <span className="result-label">Stats page, private</span>
              <div className="result-row">
                <span className="result-url small">{bare(created.statsUrl)}</span>
                <button
                  type="button"
                  className="btn quiet"
                  onClick={() => copy(created.statsUrl, "stats")}
                  aria-live="polite"
                >
                  {copied === "stats" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <p className="note">
              Keep the stats page link somewhere safe. It&apos;s the only way to
              see your clicks, and anyone with it can see them too. This browser
              also remembers it under Your links.
            </p>
          </>
        )}
      </section>

      {saved.length > 0 && (
        <section className="block">
          <h2>Your links</h2>
          <div>
            <ul className="mylinks">
              {saved.map((l) => (
                <li key={l.code}>
                  <div className="mylink-meta">
                    <span className="mylink-target">{l.target}</span>
                    <span className="mylink-url">{path(l.shortUrl)}</span>
                  </div>
                  <div className="mylink-actions">
                    <button
                      type="button"
                      className="btn quiet"
                      onClick={() => copy(l.shortUrl, l.code)}
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
                      onClick={() => removeSaved(l.code)}
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
      )}

      <section className="block">
        <h2>Open the app, not a browser</h2>
        <div>
          <p>
            Same video, same viewer. The only difference is where the link
            opens.
          </p>
          <div className="compare">
            <div className="compare-col before">
              <h3>A regular YouTube link</h3>
              <ul>
                <li>Opens in the Instagram or TikTok browser</li>
                <li>Viewer is signed out</li>
                <li>Subscribing means signing in first</li>
              </ul>
            </div>
            <div className="compare-col after">
              <h3>
                <YouTubeIcon width={20} />A ytopen link
              </h3>
              <ul>
                <li>Opens in the YouTube app</li>
                <li>Viewer is already signed in</li>
                <li>Subscribing takes one tap</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="block">
        <h2>How it works</h2>
        <div>
          <ol className="steps">
            <li>Paste a link to a video, Short, live stream or channel.</li>
            <li>Copy your new link.</li>
            <li>Share it in your bio, stories, captions and DMs.</li>
          </ol>
          <p className="fine">
            No YouTube app? The link opens youtube.com instead, so it always
            works.
          </p>
        </div>
      </section>

      <footer>
        <p>
          Free to use. Links don&apos;t track viewers unless you turn on click
          tracking, and even then only totals are kept.
        </p>
        <p>ytopen isn&apos;t affiliated with YouTube or Google.</p>
      </footer>
    </main>
  );
}

/** Drops the protocol so links read cleanly; the copied value keeps it. */
function bare(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

/** The site is the same for every saved link, so the list shows only the path. */
function path(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return bare(url);
  }
}

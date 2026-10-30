"use client";

import { useEffect, useMemo, useState } from "react";
import { parseYouTubeUrl } from "@/lib/youtube";
import { Brand } from "./brand";
import { Hero, Explainer } from "./_home/sections";
import { LinkResult } from "./_home/link-result";
import { YourLinks } from "./_home/your-links";
import { loadSaved, persistSaved, type SavedLink } from "./_home/saved-links";
import { useCopy } from "./_home/use-copy";
import { SponsorRail } from "./_home/sponsor-rail";

export default function Home() {
  const [input, setInput] = useState("");
  const [sub, setSub] = useState(false);
  const [track, setTrack] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{
    shortUrl: string;
    statsUrl: string;
  } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedLink[]>([]);
  const { copied, copy, reset: resetCopied } = useCopy();

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
    resetCopied();
    setCreated(null);
    setApiError(null);
  }, [link, track]);

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
      setApiError(
        "Couldn't reach ytopen. Check your connection and try again.",
      );
      setCreating(false);
      return;
    }
    try {
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.code) {
        setApiError(
          json.error ?? "Couldn't create the link. Try again in a minute.",
        );
        return;
      }
      setCreated(json);
      const code = json.code as string;
      const entry: SavedLink = {
        code,
        shortUrl: json.shortUrl,
        statsUrl: json.statsUrl,
        target: target!.kind === "video" ? `Video ${target!.id}` : target!.id,
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
    <div className="home">
      <SponsorRail side="left" />
      <main className="wrap">
        <Brand />
        <Hero />

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
              This isn&apos;t a YouTube video or channel link. Playlists
              aren&apos;t supported.
            </p>
          )}

          {target && (
            <div className="options">
              {target.kind === "channel" && (
                <label className="toggle">
                  <span>
                    Ask viewers to subscribe
                    <small>
                      Shows YouTube&apos;s subscribe prompt in desktop browsers.
                      In the app, viewers land on your channel.
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
                    Makes a short link with a private stats page: total clicks,
                    a 30-day chart and the split by device.
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
            <LinkResult
              label="Your link"
              url={link}
              copied={copied === "plain"}
              onCopy={() => copy(link, "plain")}
              qr
            />
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
              <LinkResult
                label="Your link"
                url={created.shortUrl}
                copied={copied === "short"}
                onCopy={() => copy(created.shortUrl, "short")}
                qr
              />
              <LinkResult
                label="Stats page, private"
                url={created.statsUrl}
                copied={copied === "stats"}
                onCopy={() => copy(created.statsUrl, "stats")}
                quiet
              />
              <p className="note">
                Keep the stats page link somewhere safe. It&apos;s the only way
                to see your clicks, and anyone with it can see them too. This
                browser also remembers it under Your links.
              </p>
            </>
          )}
        </section>

        <YourLinks
          links={saved}
          copied={copied}
          onCopy={copy}
          onRemove={removeSaved}
        />
        <Explainer />
      </main>
      <SponsorRail side="right" />
    </div>
  );
}

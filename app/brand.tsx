export function Brand() {
  return (
    <a className="brand" href="/" aria-label="ytopen home">
      {/* A play arrow leaving a frame: the link breaks out of the in-app browser. */}
      <svg viewBox="0 0 64 64" width="22" height="22" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#f4f4f1" />
        <path
          d="M18 28v18h18"
          fill="none"
          stroke="#000"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M46 18 40.4 36.4 27.6 23.6z"
          fill="#000"
          stroke="#000"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        <span className="brand-yt">yt</span>open
      </span>
    </a>
  );
}

/** YouTube's play-button icon, shown to say where links open. */
export function YouTubeIcon({ width = 28 }: { width?: number }) {
  return (
    <svg
      viewBox="0 0 28 20"
      width={width}
      height={(width * 20) / 28}
      role="img"
      aria-label="YouTube"
      className="yt-icon"
    >
      <path
        d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9z"
        fill="#FF0000"
      />
      <path d="M11.2 14.3 18.5 10l-7.3-4.3z" fill="#fff" />
    </svg>
  );
}

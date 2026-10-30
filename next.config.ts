import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This repository can live below another npm workspace. Keep build tracing
  // scoped here instead of letting Next.js infer a parent lockfile as the root.
  outputFileTracingRoot: process.cwd(),
  // Short channel links: /@handle serves the same page as /c/@handle.
  // Handles always start with "@", so this can't collide with other routes.
  async rewrites() {
    return [{ source: "/:handle(@[A-Za-z0-9._-]{3,30})", destination: "/c/:handle" }];
  },
};

export default nextConfig;

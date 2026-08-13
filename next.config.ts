import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This repository can live below another npm workspace. Keep build tracing
  // scoped here instead of letting Next.js infer a parent lockfile as the root.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;

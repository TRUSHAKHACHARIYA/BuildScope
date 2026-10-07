import { existsSync } from "node:fs";
import path from "node:path";

import type { NextConfig } from "next";

const monorepoRoot = path.join(import.meta.dirname, "../..");

// Share the monorepo root `.env` with the API. Variables already set in the environment win.
const rootEnvFile = path.join(monorepoRoot, ".env");
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  poweredByHeader: false,
  transpilePackages: ["@buildscope/shared"],
  turbopack: {
    root: monorepoRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

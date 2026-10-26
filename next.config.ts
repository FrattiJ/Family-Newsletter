import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is behind the family password and personalised, so there is
  // nothing worth prerendering and caching only gets in the way here.
  experimental: {
    serverActions: {
      // Room for a resized family photo plus multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    // Pin the workspace root; otherwise a stray lockfile in a parent folder
    // can make the bundler guess wrongly.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

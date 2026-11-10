import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Baseline browser protections: the site can't be framed by another page
  // (clickjacking), files are never sniffed into a different type (so an
  // uploaded "photo" can't be run as a page), and full URLs aren't leaked to
  // other sites.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
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

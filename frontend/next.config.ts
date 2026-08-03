import type { NextConfig } from "next";

// Backend API (the Next app on the VPS). Set BACKEND_URL in Vercel / .env.local.
const BACKEND_URL = (
  process.env.BACKEND_URL || "http://213.210.36.122:3100"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  // The browser only ever talks to this Vercel origin over https. Client-side
  // `fetch("/api/...")` calls are proxied server-side to the http VPS backend,
  // so there's no mixed-content block and no CORS to configure.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

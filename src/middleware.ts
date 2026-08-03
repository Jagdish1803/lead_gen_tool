import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Allow the Vercel frontend to call this backend API cross-origin.
// Set FRONTEND_ORIGIN to your Vercel URL in production; defaults to "*".
const ALLOW = process.env.FRONTEND_ORIGIN || "*";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOW,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
  }
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(corsHeaders())) res.headers.set(k, v);
  return res;
}

export const config = { matcher: "/api/:path*" };

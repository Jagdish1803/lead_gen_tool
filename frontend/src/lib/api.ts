import "server-only";

// Base URL of the backend API (the Next app running on the VPS). Set BACKEND_URL
// in the environment (Vercel project settings / .env.local). Server-side only —
// this runs on Vercel's server, so calling the backend over http is fine (no
// browser "mixed content" rule applies).
export const BACKEND_URL = (
  process.env.BACKEND_URL || "http://213.210.36.122:3100"
).replace(/\/$/, "");

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** GET a backend JSON endpoint. Always fresh (no caching). */
export async function apiGet<T>(
  path: string,
  opts: { allow404?: boolean } = {},
): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, { cache: "no-store" });
  if (res.status === 404 && opts.allow404) {
    return null as T;
  }
  if (!res.ok) {
    throw new ApiError(res.status, `GET ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}

/** POST JSON to a backend endpoint and return the parsed JSON response. */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return data;
}

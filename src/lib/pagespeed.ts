import "server-only";

/**
 * Best-effort Google PageSpeed Insights (Lighthouse) client.
 *
 * Works without an API key (rate-limited). If PAGESPEED_API_KEY is set, it's
 * used to raise the quota. Any failure (rate limit, timeout, unreachable) is
 * swallowed and returns null — the audit continues on signal checks alone.
 */

const ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export interface PageSpeedResult {
  performance: number | null; // 0-100 Lighthouse performance score
}

export async function getPageSpeed(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
): Promise<PageSpeedResult> {
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
  });
  const key = process.env.PAGESPEED_API_KEY;
  if (key) params.set("key", key);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return { performance: null };

    const data = await res.json();
    const score = data?.lighthouseResult?.categories?.performance?.score;
    return {
      performance: typeof score === "number" ? Math.round(score * 100) : null,
    };
  } catch {
    return { performance: null };
  } finally {
    clearTimeout(timeout);
  }
}

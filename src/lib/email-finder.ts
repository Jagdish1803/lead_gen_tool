import "server-only";
import { sql } from "@/lib/db";
import type { Business } from "@/lib/types";

/**
 * Email finder: visits each lead's website (home + a contact page) and
 * extracts a contact email address. Best-effort; never throws per lead.
 */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

// Junk to ignore (asset filenames, tracking, examples, no-reply addresses).
const JUNK = [
  /\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i,
  /(sentry|wixpress|example|yourdomain|domain\.com|email\.com|godaddy|cloudflare|schema\.org|w3\.org|sentry\.io)/i,
  /^(no-?reply|donotreply|do-not-reply|noreply)@/i,
];

function extractEmail(html: string, siteHost: string): string | null {
  const found = new Set<string>();
  // mailto: links first (most reliable)
  for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) {
    found.add(m[1].toLowerCase());
  }
  for (const m of html.matchAll(EMAIL_RE)) {
    found.add(m[0].toLowerCase());
  }
  const candidates = [...found].filter(
    (e) => !JUNK.some((re) => re.test(e)) && e.length < 60,
  );
  if (candidates.length === 0) return null;
  // Prefer an email on the same domain as the website.
  const host = siteHost.replace(/^www\./, "");
  const sameDomain = candidates.find((e) => e.split("@")[1]?.includes(host));
  return sameDomain ?? candidates[0];
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; PitchingToolBot/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return "";
    return (await res.text()).slice(0, 300_000);
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function findEmailForSite(rawUrl: string): Promise<string | null> {
  const base = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  let host = "";
  try {
    host = new URL(base).hostname;
  } catch {
    return null;
  }

  // Homepage first, then a couple of common contact pages.
  const pages = [base, `${base.replace(/\/$/, "")}/contact`, `${base.replace(/\/$/, "")}/contact-us`];
  for (const page of pages) {
    const html = await fetchText(page);
    if (!html) continue;
    const email = extractEmail(html, host);
    if (email) return email;
  }
  return null;
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (i < items.length) await fn(items[i++]);
    },
  );
  await Promise.all(workers);
}

export interface EmailFinderResult {
  processed: number;
  found: number;
  remaining: number;
}

/** Find emails for up to `limit` leads that have a website but no email yet. */
export async function runEmailFinder({
  limit = 8,
  concurrency = 4,
}: { limit?: number; concurrency?: number } = {}): Promise<EmailFinderResult> {
  const pending = await sql<Business[]>`
    select * from businesses
    where website is not null and email is null
    order by created_at
    limit ${limit}
  `;

  let found = 0;
  await mapPool(pending, concurrency, async (b) => {
    try {
      const email = await findEmailForSite(b.website!);
      if (email) {
        await sql`update businesses set email = ${email} where id = ${b.id}`;
        found++;
      } else {
        // Mark as searched (empty) so we don't retry endlessly — use '' sentinel.
        await sql`update businesses set email = '' where id = ${b.id}`;
      }
    } catch {
      await sql`update businesses set email = '' where id = ${b.id}`;
    }
  });

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from businesses
    where website is not null and email is null
  `;

  return { processed: pending.length, found, remaining: n };
}

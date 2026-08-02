import "server-only";
import { sql } from "@/lib/db";
import { getPageSpeed } from "@/lib/pagespeed";
import type { Business } from "@/lib/types";

/**
 * Auditor: checks each business's web presence and writes an `audits` row.
 * No website  → flagged as a strong lead for a new site.
 * Has website → checks HTTPS, mobile-friendliness, speed (best-effort), age.
 */

interface SiteCheck {
  reachable: boolean;
  https: boolean;
  mobileViewport: boolean;
  staleCopyright: boolean;
  clickToCall: boolean;
  hasForm: boolean;
}

async function checkWebsite(rawUrl: string): Promise<SiteCheck> {
  const result: SiteCheck = {
    reachable: false,
    https: false,
    mobileViewport: false,
    staleCopyright: false,
    clickToCall: false,
    hasForm: false,
  };

  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; PitchingToolBot/1.0; web audit)",
      },
      cache: "no-store",
    });

    result.reachable = res.status < 400;
    result.https = res.url.startsWith("https:");

    const html = (await res.text()).slice(0, 200_000); // cap read
    result.mobileViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    result.clickToCall = /href\s*=\s*["']?tel:/i.test(html);
    result.hasForm = /<form[\s>]/i.test(html);

    const yearMatch = html.match(/(?:©|&copy;|copyright)[^0-9]{0,12}(20\d{2})/i);
    if (yearMatch) {
      const year = Number(yearMatch[1]);
      const currentYear = new Date().getFullYear();
      if (year <= currentYear - 3) result.staleCopyright = true;
    }
  } catch {
    // unreachable / timeout / blocked — leave reachable = false
  } finally {
    clearTimeout(timeout);
  }

  return result;
}

function buildSummary(issues: string[], perf: number | null): string {
  if (issues.includes("no_website")) {
    return "No website found — a strong candidate for a brand-new site.";
  }
  if (issues.includes("unreachable")) {
    return "Website didn't load — may be down, broken, or blocking visitors.";
  }
  const parts: string[] = [];
  if (issues.includes("no_https")) parts.push("no HTTPS (insecure)");
  if (issues.includes("not_mobile_friendly")) parts.push("not mobile-friendly");
  if (issues.includes("slow_mobile"))
    parts.push(`slow on mobile${perf !== null ? ` (${perf}/100)` : ""}`);
  if (issues.includes("stale_content")) parts.push("looks outdated");

  if (parts.length === 0) return "Website looks solid — no major issues found.";
  return `Issues found: ${parts.join(", ")}.`;
}

/** Audit one business. Never throws — records an audit either way. */
export async function auditBusiness(b: Business): Promise<void> {
  const issues: string[] = [];
  const hasWebsite = Boolean(b.website);
  let https: boolean | null = null;
  let mobileOk: boolean | null = null;
  let perfMobile: number | null = null;
  let loadTime: number | null = null;
  let clickToCall: boolean | null = null;
  let hasForm: boolean | null = null;

  try {
    if (!hasWebsite) {
      issues.push("no_website");
    } else {
      const site = await checkWebsite(b.website!);
      if (!site.reachable) {
        issues.push("unreachable");
      } else {
        https = site.https;
        mobileOk = site.mobileViewport;
        clickToCall = site.clickToCall;
        hasForm = site.hasForm;
        if (!https) issues.push("no_https");
        if (!mobileOk) issues.push("not_mobile_friendly");
        if (site.staleCopyright) issues.push("stale_content");
        if (!clickToCall) issues.push("no_click_to_call");
        if (!hasForm) issues.push("no_booking_form");

        const ps = await getPageSpeed(b.website!, "mobile");
        perfMobile = ps.performance;
        loadTime = ps.loadTimeSec;
        if (perfMobile !== null && perfMobile < 50) issues.push("slow_mobile");
      }
    }

    const summary = buildSummary(issues, perfMobile);

    await sql`
      insert into audits (
        business_id, has_website, pagespeed_mobile, mobile_ok, https,
        load_time_sec, has_click_to_call, has_form, issues, summary
      ) values (
        ${b.id}, ${hasWebsite}, ${perfMobile}, ${mobileOk}, ${https},
        ${loadTime}, ${clickToCall}, ${hasForm}, ${sql.json(issues)}, ${summary}
      )
    `;
    await sql`update businesses set status = 'audited' where id = ${b.id}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Still mark audited so the pipeline doesn't loop on this lead.
    await sql`
      insert into audits (business_id, has_website, issues, summary)
      values (${b.id}, ${hasWebsite}, ${sql.json(["audit_error"])}, ${`Audit error: ${message}`})
    `;
    await sql`update businesses set status = 'audited' where id = ${b.id}`;
    await sql`
      insert into events (business_id, stage, level, message)
      values (${b.id}, 'auditor', 'error', ${message})
    `;
  }
}

// Simple concurrency pool.
async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (i < items.length) {
        const idx = i++;
        await fn(items[idx]);
      }
    },
  );
  await Promise.all(workers);
}

export interface AuditRunResult {
  audited: number;
  remaining: number;
}

/**
 * Audit up to `limit` un-audited businesses (status = 'found').
 * Called repeatedly in batches so each request stays short.
 */
export async function runAuditor({
  limit = 8,
  concurrency = 3,
}: {
  limit?: number;
  concurrency?: number;
} = {}): Promise<AuditRunResult> {
  const pending = await sql<Business[]>`
    select * from businesses
    where status = 'found'
    order by created_at
    limit ${limit}
  `;

  await mapPool(pending, concurrency, auditBusiness);

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from businesses where status = 'found'
  `;

  return { audited: pending.length, remaining: n };
}

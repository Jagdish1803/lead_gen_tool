import "server-only";
import { sql } from "@/lib/db";
import { generateText } from "@/lib/ai";
import type { Business } from "@/lib/types";

/**
 * Writer: turns each audited lead into a personalized WhatsApp outreach
 * message. Uses the configured AI provider; falls back to a template when
 * no AI key is set, so it always produces something.
 */

type TemplateKey = "no_website" | "poor_website" | "good_website";

interface AuditedLead extends Business {
  has_website: boolean | null;
  issues: string[] | null;
  audit_summary: string | null;
  pagespeed_mobile: number | null;
}

const ISSUE_PHRASES: Record<string, string> = {
  no_https: "it isn't secured with HTTPS",
  not_mobile_friendly: "it doesn't work well on phones",
  slow_mobile: "it loads slowly on mobile",
  stale_content: "the design looks dated",
  unreachable: "it wasn't loading when we checked",
  no_click_to_call: "there's no tap-to-call button for mobile visitors",
  no_booking_form: "there's no way for visitors to book or enquire online",
};

function pickTemplate(lead: AuditedLead): TemplateKey {
  const issues = lead.issues ?? [];
  if (!lead.has_website || issues.includes("no_website")) return "no_website";
  const problems = issues.filter((i) => i in ISSUE_PHRASES);
  return problems.length > 0 ? "poor_website" : "good_website";
}

function issueSentence(issues: string[]): string {
  const phrases = issues
    .filter((i) => i in ISSUE_PHRASES)
    .map((i) => ISSUE_PHRASES[i]);
  if (phrases.length === 0) return "";
  if (phrases.length === 1) return phrases[0];
  return `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
}

function buildPrompt(lead: AuditedLead, template: TemplateKey): string {
  const city = lead.address?.split(",").slice(-2, -1)[0]?.trim() ?? "";
  const context = [
    "You write short, friendly WhatsApp outreach messages for a web design & development agency.",
    "Goal: start a genuine conversation with a local business about their website.",
    "Rules: 2-3 short sentences, under 55 words. Warm and human, NOT salesy or spammy.",
    "Address them by their business name. End with a soft, low-pressure question (e.g. offering a quick chat).",
    "No placeholders like [Name]. No markdown. At most one emoji. Output ONLY the message text.",
    "",
    `Business name: ${lead.name}`,
    lead.category ? `Type: ${lead.category}` : "",
    city ? `City: ${city}` : "",
  ];

  if (template === "no_website") {
    context.push(
      "Situation: They have NO website. Many of their competitors do.",
      "Angle: Point out (kindly) that not having a website means losing customers who search online, and offer to build one.",
    );
  } else if (template === "poor_website") {
    context.push(
      `Situation: They have a website but it has issues: ${issueSentence(lead.issues ?? [])}.`,
      "Angle: Mention you noticed a couple of things that could be improved, and offer a quick chat to fix them.",
    );
  } else {
    context.push(
      "Situation: Their website is decent. ",
      "Angle: A light, complimentary note offering to help them get more customers from it (speed, SEO, bookings).",
    );
  }

  return context.filter(Boolean).join("\n");
}

function templateMessage(lead: AuditedLead, template: TemplateKey): string {
  const name = lead.name;
  if (template === "no_website") {
    return `Hi ${name}! We noticed you don't have a website yet — while many similar businesses nearby do, which is where a lot of new customers look first. We build clean, affordable websites and would love to help. Open to a quick chat?`;
  }
  if (template === "poor_website") {
    const s = issueSentence(lead.issues ?? []) || "a few things could be improved";
    return `Hi ${name}! We had a look at your website and noticed ${s}. These are quick to fix and can bring you more customers. Would you be open to a short chat about it?`;
  }
  return `Hi ${name}! Your website looks good. We help local businesses get more customers from their site (faster load, better Google ranking, online bookings). Would a quick chat be worth your time?`;
}

async function writeForLead(lead: AuditedLead): Promise<void> {
  const template = pickTemplate(lead);
  let body: string;
  try {
    const ai = await generateText(buildPrompt(lead, template));
    body = ai?.trim() || templateMessage(lead, template);
  } catch (err) {
    // AI failed (quota/error) — fall back to template, log it.
    body = templateMessage(lead, template);
    await sql`
      insert into events (business_id, stage, level, message)
      values (${lead.id}, 'writer', 'warn', ${
        err instanceof Error ? err.message : String(err)
      })
    `;
  }

  await sql`
    insert into messages (business_id, channel, direction, template_key, body, status)
    values (${lead.id}, 'whatsapp', 'outbound', ${template}, ${body}, 'queued')
  `;
  await sql`update businesses set status = 'drafted' where id = ${lead.id}`;
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
      while (i < items.length) await fn(items[i++]);
    },
  );
  await Promise.all(workers);
}

export interface WriteRunResult {
  written: number;
  remaining: number;
}

/** Draft messages for up to `limit` audited leads that don't have one yet. */
export async function runWriter({
  limit = 8,
  concurrency = 2, // keep under free-tier AI rate limits; groq.ts also retries
}: {
  limit?: number;
  concurrency?: number;
} = {}): Promise<WriteRunResult> {
  const pending = await sql<AuditedLead[]>`
    select
      b.*,
      a.has_website, a.issues, a.summary as audit_summary, a.pagespeed_mobile
    from businesses b
    left join lateral (
      select * from audits where business_id = b.id
      order by created_at desc limit 1
    ) a on true
    where b.status = 'audited'
      and not exists (
        select 1 from messages m
        where m.business_id = b.id and m.channel = 'whatsapp'
          and m.direction = 'outbound'
      )
    order by b.created_at
    limit ${limit}
  `;

  await mapPool(pending, concurrency, writeForLead);

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from businesses b
    where b.status = 'audited'
      and not exists (
        select 1 from messages m
        where m.business_id = b.id and m.channel = 'whatsapp'
          and m.direction = 'outbound'
      )
  `;

  return { written: pending.length, remaining: n };
}

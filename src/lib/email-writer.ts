import "server-only";
import { sql } from "@/lib/db";
import { generateText } from "@/lib/ai";
import type { Business } from "@/lib/types";

/**
 * Email writer: drafts a cold outreach email (subject + body) per lead that
 * has an email address but no email message yet. AI-written, template fallback.
 */

interface AuditedLead extends Business {
  has_website: boolean | null;
  issues: string[] | null;
}

const ISSUE_PHRASES: Record<string, string> = {
  no_https: "it isn't secured with HTTPS",
  not_mobile_friendly: "it doesn't display well on phones",
  slow_mobile: "it loads slowly on mobile",
  stale_content: "the design looks a little dated",
  unreachable: "it wasn't loading when we checked",
};

type TemplateKey = "no_website" | "poor_website" | "good_website";

function pickTemplate(lead: AuditedLead): TemplateKey {
  const issues = lead.issues ?? [];
  if (!lead.has_website || issues.includes("no_website")) return "no_website";
  return issues.some((i) => i in ISSUE_PHRASES) ? "poor_website" : "good_website";
}

function issueSentence(issues: string[]): string {
  const p = issues.filter((i) => i in ISSUE_PHRASES).map((i) => ISSUE_PHRASES[i]);
  if (p.length === 0) return "";
  if (p.length === 1) return p[0];
  return `${p.slice(0, -1).join(", ")} and ${p[p.length - 1]}`;
}

function buildPrompt(lead: AuditedLead, template: TemplateKey): string {
  const lines = [
    "Write a short, friendly cold outreach EMAIL from a web design & development agency to a local business.",
    "Format your reply EXACTLY as:",
    "Subject: <a short, specific subject line>",
    "<blank line>",
    "<email body: 3-5 short sentences, warm and professional, not spammy>",
    "End the body with a soft call to action (offer a quick call). Sign off as 'Best regards'. No placeholders like [Name].",
    "",
    `Business: ${lead.name}`,
    lead.category ? `Type: ${lead.category}` : "",
  ];
  if (template === "no_website") {
    lines.push(
      "Situation: they have NO website while competitors do. Offer to build one and explain the value of being found online.",
    );
  } else if (template === "poor_website") {
    lines.push(
      `Situation: their website has issues: ${issueSentence(lead.issues ?? [])}. Offer to fix them.`,
    );
  } else {
    lines.push(
      "Situation: their site is decent. Offer help getting more customers from it (SEO, speed, bookings).",
    );
  }
  return lines.filter(Boolean).join("\n");
}

function templateEmail(lead: AuditedLead, template: TemplateKey): {
  subject: string;
  body: string;
} {
  const name = lead.name;
  if (template === "no_website") {
    return {
      subject: `A website for ${name}?`,
      body: `Hi ${name},\n\nI noticed your business doesn't have a website yet — while many similar businesses nearby do, which is where a lot of customers look first. We build clean, affordable websites for local businesses and would love to help you get found online.\n\nWould you be open to a quick call this week?\n\nBest regards`,
    };
  }
  if (template === "poor_website") {
    const s = issueSentence(lead.issues ?? []) || "a few things could be improved";
    return {
      subject: `A couple of quick fixes for ${name}'s website`,
      body: `Hi ${name},\n\nI had a look at your website and noticed ${s}. These are quick to fix and can help you win more customers online.\n\nWould you be open to a short call to talk it through?\n\nBest regards`,
    };
  }
  return {
    subject: `Getting more customers from ${name}'s website`,
    body: `Hi ${name},\n\nYour website looks good. We help local businesses get more customers from their site — faster load times, better Google ranking, and online bookings.\n\nWould a quick call be worth your time?\n\nBest regards`,
  };
}

function parseSubjectBody(text: string): { subject: string; body: string } {
  const match = text.match(/^\s*subject:\s*(.+)/i);
  if (match) {
    const subject = match[1].trim();
    const body = text.slice(text.indexOf(match[0]) + match[0].length).trim();
    return { subject, body: body || text.trim() };
  }
  return { subject: "Quick question about your website", body: text.trim() };
}

async function writeEmailForLead(lead: AuditedLead): Promise<void> {
  const template = pickTemplate(lead);
  let subject: string;
  let body: string;
  try {
    const ai = await generateText(buildPrompt(lead, template));
    if (ai) ({ subject, body } = parseSubjectBody(ai));
    else ({ subject, body } = templateEmail(lead, template));
  } catch {
    ({ subject, body } = templateEmail(lead, template));
  }

  await sql`
    insert into messages (business_id, channel, direction, template_key, subject, body, status)
    values (${lead.id}, 'email', 'outbound', ${template}, ${subject}, ${body}, 'queued')
  `;
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

export interface EmailWriteResult {
  written: number;
  remaining: number;
}

/** Draft emails for up to `limit` leads that have an email but no email yet. */
export async function runEmailWriter({
  limit = 6,
  concurrency = 2,
}: { limit?: number; concurrency?: number } = {}): Promise<EmailWriteResult> {
  const pending = await sql<AuditedLead[]>`
    select b.*, a.has_website, a.issues
    from businesses b
    left join lateral (
      select * from audits where business_id = b.id
      order by created_at desc limit 1
    ) a on true
    where b.email is not null and b.email <> ''
      and not exists (
        select 1 from messages m
        where m.business_id = b.id and m.channel = 'email'
      )
    order by b.created_at
    limit ${limit}
  `;

  await mapPool(pending, concurrency, writeEmailForLead);

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from businesses b
    where b.email is not null and b.email <> ''
      and not exists (
        select 1 from messages m
        where m.business_id = b.id and m.channel = 'email'
      )
  `;

  return { written: pending.length, remaining: n };
}

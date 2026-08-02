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
    "You write WhatsApp outreach messages for a web design & development agency.",
    "Goal: start a genuine conversation with a local business about their website.",
    "Length: 4-6 sentences, roughly 80-120 words — detailed and helpful, like a thoughtful email but in a natural WhatsApp tone.",
    "Be warm, professional and specific. Mention the concrete issue(s) you found and how you can help. Explain the value briefly.",
    "Address them by their business name. End with a soft, low-pressure question offering a quick call or chat.",
    "STRICT: absolutely NO emojis of any kind. No placeholders like [Name]. No markdown. Output ONLY the message text.",
    "",
    `Business name: ${lead.name}`,
    lead.category ? `Type: ${lead.category}` : "",
    city ? `City: ${city}` : "",
  ];

  if (template === "no_website") {
    context.push(
      "Situation: They have NO website. Many of their competitors do.",
      "Angle: Kindly explain that most customers search online first, so not having a website means losing potential business to competitors who do. Offer to build them a clean, affordable, mobile-friendly website that brings in enquiries.",
    );
  } else if (template === "poor_website") {
    context.push(
      `Situation: They have a website but it has issues: ${issueSentence(lead.issues ?? [])}.`,
      "Angle: Explain the specific problems you noticed, why they matter (lost customers, poor mobile experience), and that they're quick to fix. Offer a short call to walk through the improvements.",
    );
  } else {
    context.push(
      "Situation: Their website is decent.",
      "Angle: A genuine, complimentary note, then offer to help them get more customers from it — faster load times, better Google ranking, and online booking/enquiry forms. Offer a quick chat.",
    );
  }

  return context.filter(Boolean).join("\n");
}

function templateMessage(lead: AuditedLead, template: TemplateKey): string {
  const name = lead.name;
  if (template === "no_website") {
    return `Hi ${name}, I came across your business while looking at ${lead.category ?? "local businesses"} in the area. I noticed you don't have a website yet, which stood out because most of your competitors do. These days the vast majority of customers search online before they call or visit, so without a site you're likely losing enquiries to businesses that show up in those searches. We design clean, affordable, mobile-friendly websites for local businesses that are built to bring in leads and calls. I'd love to show you a couple of quick ideas for what yours could look like. Would you be open to a short call this week?`;
  }
  if (template === "poor_website") {
    const s = issueSentence(lead.issues ?? []) || "a few things that could be improved";
    return `Hi ${name}, I had a proper look at your website and, while there's a good foundation there, I noticed ${s}. Issues like these quietly cost you customers, especially on mobile where most people browse today. The good news is they're usually quick to fix, and sorting them out can noticeably improve how many visitors turn into enquiries and calls. We help local businesses tidy up their sites and get more out of them without a big spend. Would you be open to a short call so I can walk you through exactly what I'd change?`;
  }
  return `Hi ${name}, I came across your website and it already looks solid, so credit to you for that. Where I think there's real opportunity is in getting more customers out of it. Small improvements to loading speed, Google ranking, and adding an easy online booking or enquiry form can meaningfully increase the leads a good site brings in. We help local businesses do exactly that without overcomplicating things. If you're open to it, I'd be happy to jump on a quick call and share a few specific ideas for your site. Would that be worth a few minutes of your time?`;
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

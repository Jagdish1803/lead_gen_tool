import "server-only";
import { sql } from "@/lib/db";
import type {
  Business,
  BusinessStatus,
  Search,
  AppSettings,
  WhatsAppState,
  Audit,
  Message,
  MessageStatus,
  PipelineEvent,
} from "@/lib/types";

export interface SentEmail {
  id: string;
  business_id: string;
  business_name: string;
  to_email: string | null;
  subject: string | null;
  body: string;
  status: MessageStatus;
  sent_at: string | null;
  created_at: string;
}

/** All outbound emails (drafted + sent), newest first. */
export async function getSentEmails(limit = 5000): Promise<SentEmail[]> {
  return sql<SentEmail[]>`
    select
      m.id, m.business_id, b.name as business_name, b.email as to_email,
      m.subject, m.body, m.status, m.sent_at, m.created_at
    from messages m
    join businesses b on b.id = m.business_id
    where m.channel = 'email' and m.direction = 'outbound'
    order by m.created_at desc
    limit ${limit}
  `;
}

/** Count of businesses in each pipeline stage. */
export async function getStageCounts(): Promise<Record<BusinessStatus, number>> {
  const rows = await sql<{ status: BusinessStatus; count: string }[]>`
    select status, count(*)::int as count
    from businesses
    group by status
  `;
  const counts = {} as Record<BusinessStatus, number>;
  for (const row of rows) counts[row.status] = Number(row.count);
  return counts;
}

/** Most recent leads for the dashboard table. */
export async function getRecentLeads(limit = 10): Promise<Business[]> {
  return sql<Business[]>`
    select *
    from businesses
    order by created_at desc
    limit ${limit}
  `;
}

/** All leads, newest first. */
export async function getAllLeads(limit = 5000): Promise<Business[]> {
  return sql<Business[]>`
    select *
    from businesses
    order by created_at desc
    limit ${limit}
  `;
}

export interface LeadWithAudit extends Business {
  has_website: boolean | null;
  issues: string[] | null;
  audit_summary: string | null;
  pagespeed_mobile: number | null;
  message_body: string | null;
  message_template: string | null;
  wa_sent: boolean;
  email_sent: boolean;
}

export type LeadSort = "newest" | "rating" | "reviews" | "name";
export type LeadFilter =
  | "all"
  | "no_website"
  | "has_issues"
  | "not_contacted"
  | "contacted";

/** All leads with their most recent audit + drafted message, sorted/filtered. */
export async function getLeadsWithAudits({
  sort = "newest",
  filter = "all",
  limit = 5000,
}: {
  sort?: LeadSort;
  filter?: LeadFilter;
  limit?: number;
} = {}): Promise<LeadWithAudit[]> {
  const orderBy =
    sort === "rating"
      ? sql`b.rating desc nulls last, b.reviews_count desc nulls last`
      : sort === "reviews"
        ? sql`b.reviews_count desc nulls last`
        : sort === "name"
          ? sql`b.name asc`
          : sql`b.created_at desc`;

  const conditions = [];
  if (filter === "no_website") {
    conditions.push(sql`a.has_website is false`);
  } else if (filter === "has_issues") {
    conditions.push(
      sql`a.has_website is true and jsonb_array_length(coalesce(a.issues, '[]'::jsonb)) > 0`,
    );
  } else if (filter === "not_contacted") {
    conditions.push(sql`b.status in ('found','audited','drafted','queued')`);
  } else if (filter === "contacted") {
    conditions.push(
      sql`b.status in ('contacted','replied','interested','client')`,
    );
  }
  const whereClause = conditions.length
    ? sql`where ${conditions.reduce((acc, c) => sql`${acc} and ${c}`)}`
    : sql``;

  return sql<LeadWithAudit[]>`
    select
      b.*,
      a.has_website,
      a.issues,
      a.summary as audit_summary,
      a.pagespeed_mobile,
      m.body as message_body,
      m.template_key as message_template,
      exists (select 1 from messages mw where mw.business_id = b.id
        and mw.channel = 'whatsapp' and mw.status = 'sent') as wa_sent,
      exists (select 1 from messages me where me.business_id = b.id
        and me.channel = 'email' and me.status = 'sent') as email_sent
    from businesses b
    left join lateral (
      select * from audits
      where business_id = b.id
      order by created_at desc
      limit 1
    ) a on true
    left join lateral (
      select * from messages
      where business_id = b.id and direction = 'outbound'
      order by created_at desc
      limit 1
    ) m on true
    ${whereClause}
    order by ${orderBy}
    limit ${limit}
  `;
}

export interface LeadDetail {
  business: Business;
  audit: Audit | null;
  messages: Message[];
  events: PipelineEvent[];
}

/** Full detail for one lead: business, latest audit, all messages, timeline. */
export async function getLeadDetail(id: string): Promise<LeadDetail | null> {
  const [business] = await sql<Business[]>`
    select * from businesses where id = ${id}
  `;
  if (!business) return null;

  const [audit] = await sql<Audit[]>`
    select * from audits where business_id = ${id}
    order by created_at desc limit 1
  `;
  const messages = await sql<Message[]>`
    select * from messages where business_id = ${id}
    order by created_at
  `;
  const events = await sql<PipelineEvent[]>`
    select * from events where business_id = ${id}
    order by created_at desc limit 50
  `;

  return { business, audit: audit ?? null, messages, events };
}

/** Search history, newest first. */
export async function getSearches(limit = 1000): Promise<Search[]> {
  return sql<Search[]>`
    select *
    from searches
    order by created_at desc
    limit ${limit}
  `;
}

/** Counts for the sidebar nav. */
export async function getSidebarCounts(): Promise<{
  leads: number;
  searches: number;
  outreach: number;
}> {
  const [r] = await sql<
    { leads: number; searches: number; outreach: number }[]
  >`
    select
      (select count(*)::int from businesses) as leads,
      (select count(*)::int from searches) as searches,
      (select count(*)::int from messages where status = 'sent') as outreach
  `;
  return r;
}

export interface NextAction {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  phone: string | null;
  email: string | null;
  issue_count: number;
  wa_body: string | null;
  email_subject: string | null;
  email_body: string | null;
}

/** Top leads worth acting on: audited/drafted, most issues, best rating. */
export async function getBestNextActions(limit = 5): Promise<NextAction[]> {
  return sql<NextAction[]>`
    select
      b.id, b.name, b.address, b.rating, b.phone, b.email,
      coalesce(jsonb_array_length(a.issues), 0) as issue_count,
      wm.body as wa_body,
      em.subject as email_subject, em.body as email_body
    from businesses b
    left join lateral (select issues from audits
      where business_id = b.id order by created_at desc limit 1) a on true
    left join lateral (select body from messages
      where business_id = b.id and channel = 'whatsapp'
      order by created_at desc limit 1) wm on true
    left join lateral (select subject, body from messages
      where business_id = b.id and channel = 'email'
      order by created_at desc limit 1) em on true
    where b.status in ('audited', 'drafted', 'queued')
    order by coalesce(jsonb_array_length(a.issues), 0) desc,
             b.rating desc nulls last
    limit ${limit}
  `;
}

/** Outreach summary: sends per channel + reply rate. */
export async function getOutreachStats(): Promise<{
  waSent: number;
  emailSent: number;
  replyRate: number;
}> {
  const [r] = await sql<
    { wa_sent: number; email_sent: number; replied: number; contacted: number }[]
  >`
    select
      (select count(*)::int from messages where channel = 'whatsapp' and status = 'sent') as wa_sent,
      (select count(*)::int from messages where channel = 'email' and status = 'sent') as email_sent,
      (select count(*)::int from businesses where status in ('replied','interested','client')) as replied,
      (select count(*)::int from businesses where status in ('contacted','replied','interested','client')) as contacted
  `;
  return {
    waSent: r.wa_sent,
    emailSent: r.email_sent,
    replyRate: r.contacted > 0 ? Math.round((r.replied / r.contacted) * 100) : 0,
  };
}

/** Daily sends (whatsapp + email) for the last N days, oldest→newest. */
export async function getOutreachDaily(
  days = 14,
): Promise<{ day: string; wa: number; email: number }[]> {
  const rows = await sql<{ day: string; channel: string; n: number }[]>`
    select (sent_at::date)::text as day, channel, count(*)::int as n
    from messages
    where status = 'sent' and sent_at >= now() - make_interval(days => ${days})
    group by day, channel
  `;
  const map = new Map<string, { wa: number; email: number }>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), { wa: 0, email: 0 });
  }
  for (const r of rows) {
    const b = map.get(r.day);
    if (b) {
      if (r.channel === "whatsapp") b.wa = r.n;
      else if (r.channel === "email") b.email = r.n;
    }
  }
  return [...map.entries()].map(([day, v]) => ({ day, ...v }));
}

/** Singleton app settings (pacing + master send switch). */
export async function getAppSettings(): Promise<AppSettings> {
  const [s] = await sql<AppSettings[]>`select * from app_settings where id = 1`;
  return s;
}

/** Singleton WhatsApp worker state (status, QR, phone, daily count). */
export async function getWhatsAppState(): Promise<WhatsAppState> {
  const [s] = await sql<WhatsAppState[]>`
    select * from whatsapp_state where id = 1
  `;
  return s;
}

/** Count of WhatsApp messages waiting in the send queue. */
export async function getQueuedCount(): Promise<number> {
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from messages
    where direction = 'outbound' and channel = 'whatsapp' and status = 'queued'
  `;
  return n;
}

/** Pending counts for each stage of the email pipeline. */
export async function getEmailCounts(): Promise<{
  toFind: number;
  toDraft: number;
  toSend: number;
  sent: number;
}> {
  const [row] = await sql<
    { to_find: number; to_draft: number; to_send: number; sent: number }[]
  >`
    select
      (select count(*)::int from businesses
        where website is not null and email is null) as to_find,
      (select count(*)::int from businesses b
        where b.email is not null and b.email <> ''
          and not exists (select 1 from messages m
            where m.business_id = b.id and m.channel = 'email')) as to_draft,
      (select count(*)::int from messages
        where channel = 'email' and direction = 'outbound' and status = 'queued') as to_send,
      (select count(*)::int from messages
        where channel = 'email' and direction = 'outbound' and status = 'sent') as sent
  `;
  return {
    toFind: row.to_find,
    toDraft: row.to_draft,
    toSend: row.to_send,
    sent: row.sent,
  };
}

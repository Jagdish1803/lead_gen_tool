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
export async function getSentEmails(limit = 200): Promise<SentEmail[]> {
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
export async function getAllLeads(limit = 200): Promise<Business[]> {
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
  limit = 300,
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
      m.template_key as message_template
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
export async function getSearches(limit = 100): Promise<Search[]> {
  return sql<Search[]>`
    select *
    from searches
    order by created_at desc
    limit ${limit}
  `;
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

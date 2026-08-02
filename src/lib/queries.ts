import "server-only";
import { sql } from "@/lib/db";
import type {
  Business,
  BusinessStatus,
  Search,
  AppSettings,
  WhatsAppState,
} from "@/lib/types";

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

/** All leads with their most recent audit + drafted message, newest first. */
export async function getLeadsWithAudits(
  limit = 200,
): Promise<LeadWithAudit[]> {
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
    order by b.created_at desc
    limit ${limit}
  `;
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

/** Count of messages waiting in the send queue. */
export async function getQueuedCount(): Promise<number> {
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from messages
    where direction = 'outbound' and status = 'queued'
  `;
  return n;
}

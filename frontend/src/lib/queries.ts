import "server-only";
import { cache } from "react";
import { apiGet } from "@/lib/api";
import type {
  Business,
  BusinessStatus,
  Search,
  Audit,
  Message,
  MessageStatus,
  PipelineEvent,
} from "@/lib/types";

// This is the FRONTEND data layer. It has no database — every function fetches
// the backend REST API (running on the VPS) and returns the same shapes the
// pages already expect, so the UI is unchanged.

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

export interface LeadDetail {
  business: Business;
  audit: Audit | null;
  messages: Message[];
  events: PipelineEvent[];
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

export interface EmailCounts {
  toFind: number;
  toDraft: number;
  toSend: number;
  sent: number;
}

interface DashboardPayload {
  counts: Record<BusinessStatus, number>;
  actions: NextAction[];
  stats: { waSent: number; emailSent: number; replyRate: number };
  daily: { day: string; wa: number; email: number }[];
  searches: Search[];
  email: EmailCounts;
}

// One request per render serves the whole dashboard (React cache de-dupes the
// six calls below into a single backend fetch).
const getDashboard = cache(
  (): Promise<DashboardPayload> => apiGet<DashboardPayload>("/api/dashboard"),
);

export async function getStageCounts(): Promise<Record<BusinessStatus, number>> {
  return (await getDashboard()).counts;
}

export async function getBestNextActions(_limit = 5): Promise<NextAction[]> {
  return (await getDashboard()).actions;
}

export async function getOutreachStats(): Promise<{
  waSent: number;
  emailSent: number;
  replyRate: number;
}> {
  return (await getDashboard()).stats;
}

export async function getOutreachDaily(
  _days = 14,
): Promise<{ day: string; wa: number; email: number }[]> {
  return (await getDashboard()).daily;
}

export async function getEmailCounts(): Promise<EmailCounts> {
  return (await getDashboard()).email;
}

export async function getSentEmails(): Promise<SentEmail[]> {
  const { emails } = await apiGet<{ emails: SentEmail[] }>("/api/emails");
  return emails;
}

export async function getLeadsWithAudits({
  sort = "newest",
  filter = "all",
  limit = 300,
}: {
  sort?: LeadSort;
  filter?: LeadFilter;
  limit?: number;
} = {}): Promise<LeadWithAudit[]> {
  const qs = new URLSearchParams({ sort, filter, limit: String(limit) });
  const { leads } = await apiGet<{ leads: LeadWithAudit[] }>(
    `/api/leads?${qs.toString()}`,
  );
  return leads;
}

export async function getLeadDetail(id: string): Promise<LeadDetail | null> {
  const res = await apiGet<{ ok: boolean; detail?: LeadDetail }>(
    `/api/leads/${id}`,
    { allow404: true },
  );
  return res?.detail ?? null;
}

export async function getSearches(limit = 100): Promise<Search[]> {
  const { searches } = await apiGet<{ searches: Search[] }>(
    `/api/searches?limit=${limit}`,
  );
  return searches;
}

export interface SidebarCounts {
  leads: number;
  searches: number;
  outreach: number;
}

export async function getShellData(): Promise<{
  counts: SidebarCounts;
  emailReady: boolean;
}> {
  return apiGet<{ counts: SidebarCounts; emailReady: boolean }>("/api/sidebar");
}

export async function getSidebarCounts(): Promise<SidebarCounts> {
  return (await getShellData()).counts;
}

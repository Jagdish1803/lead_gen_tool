// Domain types mirroring supabase/schema.sql.
// Kept hand-written for now; can be replaced by generated Supabase types later.

export type BusinessStatus =
  | "found"
  | "audited"
  | "drafted"
  | "queued"
  | "contacted"
  | "replied"
  | "interested"
  | "client"
  | "skipped"
  | "failed";

export type SearchStatus = "running" | "done" | "failed";

export type MessageStatus =
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "replied";

export interface Search {
  id: string;
  created_at: string;
  business_type: string;
  location: string;
  status: SearchStatus;
  results_count: number;
  error: string | null;
}

export interface Business {
  id: string;
  created_at: string;
  search_id: string | null;
  place_id: string | null;
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  maps_url: string | null;
  category: string | null;
  rating: number | null;
  reviews_count: number | null;
  status: BusinessStatus;
  notes: string | null;
  email: string | null;
}

export interface Audit {
  id: string;
  created_at: string;
  business_id: string;
  has_website: boolean;
  pagespeed_mobile: number | null;
  pagespeed_desktop: number | null;
  mobile_ok: boolean | null;
  https: boolean | null;
  issues: string[];
  summary: string | null;
  screenshot_url: string | null;
}

export interface Message {
  id: string;
  created_at: string;
  business_id: string;
  channel: string;
  direction: "outbound" | "inbound";
  template_key: string | null;
  subject: string | null;
  body: string;
  status: MessageStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  error: string | null;
}

export interface PipelineEvent {
  id: string;
  created_at: string;
  business_id: string | null;
  stage: "finder" | "auditor" | "writer" | "sender" | string;
  level: "info" | "warn" | "error";
  message: string;
  meta: Record<string, unknown> | null;
}

export interface AppSettings {
  id: number;
  sending_enabled: boolean;
  min_delay_sec: number;
  max_delay_sec: number;
  daily_cap: number;
  updated_at: string;
}

export type WhatsAppStatus =
  | "disconnected"
  | "connecting"
  | "qr"
  | "connected";

export interface WhatsAppState {
  id: number;
  status: WhatsAppStatus;
  qr: string | null;
  phone: string | null;
  last_error: string | null;
  sent_today: number;
  sent_today_date: string | null;
  updated_at: string;
}

// Ordered pipeline stages for the funnel display.
export const PIPELINE_STAGES: {
  key: BusinessStatus;
  label: string;
}[] = [
  { key: "found", label: "Found" },
  { key: "audited", label: "Audited" },
  { key: "drafted", label: "Drafted" },
  { key: "queued", label: "Queued" },
  { key: "contacted", label: "Contacted" },
  { key: "replied", label: "Replied" },
  { key: "interested", label: "Interested" },
  { key: "client", label: "Client" },
];

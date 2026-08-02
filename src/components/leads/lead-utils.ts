import type { LeadWithAudit } from "@/lib/queries";
import type { BusinessStatus } from "@/lib/types";

/** Short locality from a full address (e.g. "…, Goregaon West, Mumbai" → "Goregaon West"). */
export function parseArea(address: string | null): string {
  if (!address) return "";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 3];
  if (parts.length === 2) return parts[0];
  return parts[0] ?? "";
}

/** Days-ago label like "1d", "21d". */
export function daysAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.max(0, Math.floor(diff / 86_400_000));
  return `${d}d`;
}

const REAL_ISSUES = [
  "no_https",
  "not_mobile_friendly",
  "slow_mobile",
  "stale_content",
  "unreachable",
  "no_click_to_call",
  "no_booking_form",
];

/** Issues cell: "—" (no website), "clean", or "N issues". */
export function issuesInfo(lead: LeadWithAudit): {
  label: string;
  tone: "muted" | "bad" | "ok";
} {
  if (lead.has_website === false) return { label: "—", tone: "muted" };
  if (lead.has_website == null) return { label: "—", tone: "muted" };
  const n = (lead.issues ?? []).filter((i) => REAL_ISSUES.includes(i)).length;
  if (n === 0) return { label: "clean", tone: "ok" };
  return { label: `${n} issue${n === 1 ? "" : "s"}`, tone: "bad" };
}

export const CONTACTED_STATUSES: BusinessStatus[] = [
  "contacted",
  "replied",
  "interested",
  "client",
];

export const NOT_CONTACTED_STATUSES: BusinessStatus[] = [
  "found",
  "audited",
  "drafted",
  "queued",
];

/** Badge color classes per pipeline status. */
export const STATUS_STYLES: Record<BusinessStatus, string> = {
  found: "bg-zinc-500/15 text-zinc-300",
  audited: "bg-amber-500/15 text-amber-400",
  drafted: "bg-blue-500/15 text-blue-400",
  queued: "bg-indigo-500/15 text-indigo-400",
  contacted: "bg-slate-400/15 text-slate-300",
  replied: "bg-emerald-500/15 text-emerald-400",
  interested: "bg-emerald-500/20 text-emerald-300",
  client: "bg-emerald-500/25 text-emerald-300 font-semibold",
  skipped: "bg-zinc-600/15 text-zinc-500",
  failed: "bg-red-500/15 text-red-400",
};

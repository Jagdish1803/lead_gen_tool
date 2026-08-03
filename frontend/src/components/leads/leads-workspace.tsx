"use client";

import { useMemo, useState } from "react";
import { Star, Download, ChevronLeft, ChevronRight } from "lucide-react";
import type { LeadWithAudit } from "@/lib/queries";
import { LeadPanel } from "@/components/leads/lead-panel";
import { RowStatusSelect } from "@/components/leads/row-status-select";
import { likelyHasWhatsApp, waMeLink } from "@/lib/phone";
import {
  parseArea,
  daysAgo,
  issuesInfo,
  CONTACTED_STATUSES,
  NOT_CONTACTED_STATUSES,
} from "@/components/leads/lead-utils";

function hasEmail(l: LeadWithAudit): boolean {
  return Boolean(l.email && l.email !== "");
}

const PAGE_SIZE = 16;

type FilterKey =
  | "all"
  | "no_website"
  | "has_issues"
  | "not_contacted"
  | "contacted"
  | "has_whatsapp"
  | "no_whatsapp"
  | "has_email"
  | "no_email";

function matchesFilter(l: LeadWithAudit, f: FilterKey): boolean {
  switch (f) {
    case "no_website":
      return l.has_website === false;
    case "has_issues":
      return issuesInfo(l).tone === "bad";
    case "not_contacted":
      return NOT_CONTACTED_STATUSES.includes(l.status);
    case "contacted":
      return CONTACTED_STATUSES.includes(l.status);
    case "has_whatsapp":
      return likelyHasWhatsApp(l.phone);
    case "no_whatsapp":
      return !likelyHasWhatsApp(l.phone);
    case "has_email":
      return hasEmail(l);
    case "no_email":
      return !hasEmail(l);
    default:
      return true;
  }
}

export function LeadsWorkspace({ leads }: { leads: LeadWithAudit[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: leads.length,
      no_website: leads.filter((l) => matchesFilter(l, "no_website")).length,
      has_issues: leads.filter((l) => matchesFilter(l, "has_issues")).length,
      not_contacted: leads.filter((l) => matchesFilter(l, "not_contacted"))
        .length,
      contacted: leads.filter((l) => matchesFilter(l, "contacted")).length,
      has_whatsapp: leads.filter((l) => matchesFilter(l, "has_whatsapp")).length,
      no_whatsapp: leads.filter((l) => matchesFilter(l, "no_whatsapp")).length,
      has_email: leads.filter((l) => matchesFilter(l, "has_email")).length,
      no_email: leads.filter((l) => matchesFilter(l, "no_email")).length,
    }),
    [leads],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter((l) => matchesFilter(l, filter))
      .filter((l) =>
        q
          ? [l.name, l.phone, l.address, l.website]
              .filter(Boolean)
              .some((v) => v!.toLowerCase().includes(q))
          : true,
      );
  }, [leads, filter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const TABS: { key: FilterKey; label: string; n: number }[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "no_website", label: "No website", n: counts.no_website },
    { key: "has_issues", label: "Has issues", n: counts.has_issues },
    { key: "not_contacted", label: "Not contacted", n: counts.not_contacted },
    { key: "contacted", label: "Contacted", n: counts.contacted },
    { key: "has_whatsapp", label: "Has WhatsApp", n: counts.has_whatsapp },
    { key: "no_whatsapp", label: "No WhatsApp", n: counts.no_whatsapp },
    { key: "has_email", label: "Has email", n: counts.has_email },
    { key: "no_email", label: "No email", n: counts.no_email },
  ];

  function exportCsv() {
    const header = ["Business", "Area", "Rating", "Phone", "Website", "Email", "Status"];
    const lines = filtered.map((l) =>
      [
        l.name,
        parseArea(l.address),
        l.rating ?? "",
        l.phone ?? "",
        l.website ?? "",
        l.email ?? "",
        l.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="text-[13px]">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setFilter(t.key);
                setPage(0);
              }}
              className={`rounded-md px-2.5 py-1 text-[13px] transition-colors ${
                filter === t.key
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}{" "}
              <span className="ml-0.5 tabular-nums text-muted-foreground">
                {t.n}
              </span>
            </button>
          ))}
        </div>

        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search business, phone, area…"
          className="h-8 min-w-[220px] flex-1 rounded-md border bg-transparent px-3 text-[13px] outline-none placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring"
        />

        <button
          onClick={exportCsv}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <Download className="size-3.5" /> Export CSV
        </button>

        <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
          <span className="tabular-nums">
            {filtered.length === 0
              ? "0"
              : `${safePage * PAGE_SIZE + 1}–${Math.min(
                  (safePage + 1) * PAGE_SIZE,
                  filtered.length,
                )}`}{" "}
            of {filtered.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded p-1 hover:bg-accent disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage >= pageCount - 1}
            className="rounded p-1 hover:bg-accent disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 font-medium">Business</th>
              <th className="px-3 py-2 font-medium">Rating</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Website</th>
              <th className="px-3 py-2 font-medium">Issues</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Channels</th>
              <th className="px-3 py-2 font-medium">Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No leads match.
                </td>
              </tr>
            ) : (
              rows.map((l) => {
                const issues = issuesInfo(l);
                return (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className={`cursor-pointer border-b border-border/60 transition-colors hover:bg-accent/50 ${
                      selectedId === l.id ? "bg-accent/60" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{l.name}</span>
                      <span className="ml-2 text-muted-foreground">
                        {parseArea(l.address)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {l.rating != null ? (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          {l.rating}
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          {l.reviews_count != null && (
                            <span className="text-xs text-muted-foreground">
                              ({l.reviews_count})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-muted-foreground">
                      {l.phone ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">
                      {l.website ? (
                        <span className="text-sky-400/90">
                          {l.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </span>
                      ) : (
                        <span className="text-red-400/80">no website</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          issues.tone === "bad"
                            ? "text-red-400"
                            : issues.tone === "ok"
                              ? "text-muted-foreground"
                              : "text-muted-foreground"
                        }
                      >
                        {issues.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <RowStatusSelect id={l.id} status={l.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1">
                        {likelyHasWhatsApp(l.phone) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = waMeLink(l.phone, l.message_body ?? "");
                              if (link) window.open(link, "_blank", "noopener");
                            }}
                            title="Open WhatsApp"
                            className={`inline-flex size-5 items-center justify-center rounded text-[11px] font-semibold ${
                              l.wa_sent
                                ? "bg-emerald-500/20 text-emerald-500"
                                : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                            }`}
                          >
                            W
                          </button>
                        ) : (
                          <ChannelDot label="W" active={false} available={false} />
                        )}
                        <ChannelDot
                          label="@"
                          active={l.email_sent}
                          available={Boolean(l.email && l.email !== "")}
                        />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                      {daysAgo(l.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <LeadPanel
          leadId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function ChannelDot({
  label,
  active,
  available = true,
}: {
  label: string;
  active: boolean;
  available?: boolean;
}) {
  return (
    <span
      className={`inline-flex size-5 items-center justify-center rounded text-[11px] font-semibold ${
        active
          ? "bg-emerald-500/20 text-emerald-400"
          : available
            ? "bg-muted text-muted-foreground"
            : "bg-muted/40 text-muted-foreground/40"
      }`}
      title={active ? `${label} sent` : available ? `${label} available` : `${label} n/a`}
    >
      {label}
    </span>
  );
}

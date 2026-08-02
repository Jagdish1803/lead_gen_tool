"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import type { SentEmail } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";

type Filter = "all" | "sent" | "failed" | "drafted";

function matches(e: SentEmail, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "drafted") return e.status === "queued";
  return e.status === f;
}

export function EmailsList({ emails }: { emails: SentEmail[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: emails.length,
      sent: emails.filter((e) => e.status === "sent").length,
      failed: emails.filter((e) => e.status === "failed").length,
      drafted: emails.filter((e) => e.status === "queued").length,
    }),
    [emails],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return emails
      .filter((e) => matches(e, filter))
      .filter((e) =>
        q
          ? [e.business_name, e.to_email, e.subject]
              .filter(Boolean)
              .some((v) => v!.toLowerCase().includes(q))
          : true,
      );
  }, [emails, filter, query]);

  const TABS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "sent", label: "Sent" },
    { key: "failed", label: "Failed" },
    { key: "drafted", label: "Drafts" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Send className="size-4" /> Sent &amp; drafted
        </h2>
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-md px-2.5 py-1 text-[13px] transition-colors ${
                filter === t.key
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}{" "}
              <span className="text-muted-foreground">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emails…"
          className="ml-auto h-8 w-56 rounded-md border bg-transparent px-3 text-[13px] outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          No emails here yet.
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {rows.map((e) => (
            <div key={e.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{e.business_name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={
                      e.status === "sent"
                        ? "default"
                        : e.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {e.status === "queued" ? "draft" : e.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.sent_at ?? e.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                to {e.to_email ?? "—"}
              </div>
              <div className="mt-1 text-sm font-medium">{e.subject}</div>
              <div className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {e.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { runSearchAction } from "@/app/actions/search";
import { runAuditBatchAction } from "@/app/actions/audit";
import { runWriteBatchAction } from "@/app/actions/write";
import {
  findEmailsAction,
  writeEmailsAction,
  sendEmailsAction,
  type BatchResult,
} from "@/app/actions/email";

export function NewSearchForm({
  recent = [],
}: {
  recent?: { business_type: string; location: string }[];
}) {
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const router = useRouter();

  // Drain audit/write batches ({ ok, data: { remaining } }).
  async function drainStd(
    action: () => Promise<
      { ok: true; data: { remaining: number } } | { ok: false; error: string }
    >,
  ) {
    for (let i = 0; i < 800; i++) {
      const r = await action();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.data.remaining === 0) return;
      router.refresh();
    }
  }

  // Drain email batches ({ ok, remaining }).
  async function drainEmail(action: () => Promise<BatchResult>) {
    for (let i = 0; i < 800; i++) {
      const r = await action();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.remaining === 0) return;
      router.refresh();
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessType.trim() || !location.trim()) {
      toast.error("Enter both a business type and a location.");
      return;
    }
    setRunning(true);
    try {
      setPhase("Searching Google Maps…");
      const res = await runSearchAction(businessType, location);
      if (!res.ok) {
        toast.error("Search failed", { description: res.error });
        return;
      }
      toast.success(`Found ${res.data.inserted} leads — running the pipeline…`);
      router.refresh();

      setPhase("Auditing websites…");
      await drainStd(runAuditBatchAction);
      setPhase("Writing WhatsApp drafts…");
      await drainStd(runWriteBatchAction);
      setPhase("Finding emails…");
      await drainEmail(findEmailsAction);
      setPhase("Drafting emails…");
      await drainEmail(writeEmailsAction);
      setPhase("Sending emails…");
      await drainEmail(sendEmailsAction);

      toast.success("Done — emails sent, WhatsApp drafts ready to send.");
    } finally {
      setPhase(null);
      setRunning(false);
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold">Find businesses on Google Maps</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Enter a type + location — it finds them, audits each site, writes
        messages, and auto-sends the emails. You just send the WhatsApps.
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          disabled={running}
          placeholder="Dental clinic"
          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={running}
          placeholder="Andheri, Mumbai"
          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={running}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {running ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Search
        </button>
      </form>

      {phase && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
          <Loader2 className="size-3.5 animate-spin" />
          {phase}{" "}
          <span className="text-muted-foreground">
            — keep this tab open until it finishes.
          </span>
        </div>
      )}

      {!running && recent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Recent</span>
          {recent.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                setBusinessType(r.business_type);
                setLocation(r.location);
              }}
              className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {r.business_type} · {r.location}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

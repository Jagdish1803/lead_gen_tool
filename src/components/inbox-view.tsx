"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InboxMessage {
  from: string;
  fromName: string;
  subject: string;
  date: string | null;
  snippet: string;
  leadId: string | null;
  leadName: string | null;
}

export function InboxView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inbox", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setMessages(data.messages);
      else setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Inbox className="size-4" /> Inbox (replies)
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking your inbox…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-amber-600 dark:text-amber-500">
            Couldn&apos;t read the inbox
          </p>
          <p className="mt-1 text-muted-foreground">{error}</p>
          <p className="mt-2 text-muted-foreground">
            Enable IMAP in Zoho: <strong>Zoho Mail → Settings → Mail Accounts →
            IMAP Access → Enable</strong>, then Refresh.
          </p>
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          No messages in the inbox yet.
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {messages.map((m, i) => (
            <div key={i} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {m.fromName || m.from}
                  {m.leadId && (
                    <Link
                      href={`/leads/${m.leadId}`}
                      className="ml-2 text-xs text-primary hover:underline"
                    >
                      ↳ {m.leadName}
                    </Link>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {m.date ? new Date(m.date).toLocaleString() : ""}
                </span>
              </div>
              <div className="text-sm">{m.subject}</div>
              {m.snippet && (
                <div className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {m.snippet}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

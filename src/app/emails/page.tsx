import { Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSentEmails } from "@/lib/queries";
import { InboxView } from "@/components/inbox-view";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const emails = await getSentEmails();

  return (
    <AppShell>
      <div className="flex w-full max-w-4xl flex-col gap-8">
        <h1 className="text-2xl font-semibold tracking-tight">Emails</h1>

        {/* Sent / drafted */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Send className="size-4" /> Sent &amp; drafted ({emails.length})
          </h2>
          {emails.length === 0 ? (
            <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
              No emails yet. Run <strong>Find → Draft → Send emails</strong> from
              the dashboard.
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {emails.map((e) => (
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
                        {e.sent_at
                          ? new Date(e.sent_at).toLocaleString()
                          : new Date(e.created_at).toLocaleString()}
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

        {/* Inbox */}
        <InboxView />
      </div>
    </AppShell>
  );
}

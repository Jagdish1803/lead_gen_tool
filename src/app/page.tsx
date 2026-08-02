import { AppShell } from "@/components/app-shell";
import { NewSearchForm } from "@/components/new-search-form";
import { AuditButton } from "@/components/audit-button";
import { WriteButton } from "@/components/write-button";
import { BatchButton } from "@/components/batch-button";
import Link from "next/link";
import { PIPELINE_STAGES } from "@/lib/types";
import {
  getStageCounts,
  getRecentLeads,
  getWhatsAppState,
  getQueuedCount,
  getAppSettings,
  getEmailCounts,
} from "@/lib/queries";
import { isEmailConfigured } from "@/lib/email-sender";
import {
  findEmailsAction,
  writeEmailsAction,
  sendEmailsAction,
} from "@/app/actions/email";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Read from the DB per request.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [counts, leads, wa, queued, settings, email] = await Promise.all([
    getStageCounts(),
    getRecentLeads(),
    getWhatsAppState(),
    getQueuedCount(),
    getAppSettings(),
    getEmailCounts(),
  ]);

  const waConnected = wa.status === "connected";
  const sendingOn = settings.sending_enabled;
  const emailReady = isEmailConfigured();

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Find, audit, and reach out to local businesses — all in one place.
          </p>
        </div>

        {/* Sending status strip */}
        <Link
          href="/settings"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-2.5 text-sm transition-colors hover:bg-accent"
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${waConnected ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
            />
            WhatsApp:{" "}
            <span className="font-medium">
              {waConnected ? "connected" : wa.status}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${sendingOn ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            Sending:{" "}
            <span className="font-medium">{sendingOn ? "on" : "off"}</span>
          </span>
          <span className="text-muted-foreground">
            {queued} queued · {wa.sent_today} sent today
          </span>
          <span className="ml-auto text-muted-foreground">Settings →</span>
        </Link>

        <NewSearchForm />

        {/* Funnel */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Pipeline
            </h2>
            <div className="flex items-center gap-2">
              <AuditButton pending={counts.found ?? 0} />
              <WriteButton pending={counts.audited ?? 0} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {PIPELINE_STAGES.map((stage) => (
              <Card key={stage.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {stage.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-2xl font-semibold tabular-nums">
                    {counts[stage.key] ?? 0}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Email outreach */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Email outreach</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <BatchButton
                  pending={email.toFind}
                  idleLabel={`Find ${email.toFind} emails`}
                  runningVerb="Finding emails"
                  emptyLabel="Emails found"
                  action={findEmailsAction}
                />
                <BatchButton
                  pending={email.toDraft}
                  idleLabel={`Draft ${email.toDraft} emails`}
                  runningVerb="Drafting emails"
                  emptyLabel="Emails drafted"
                  action={writeEmailsAction}
                />
                <BatchButton
                  pending={emailReady ? email.toSend : 0}
                  idleLabel={`Send ${email.toSend} emails`}
                  runningVerb="Sending emails"
                  emptyLabel={emailReady ? "Nothing to send" : "Send emails"}
                  action={sendEmailsAction}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Find business emails from their websites → draft an email → send
            automatically.{" "}
            {emailReady ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                SMTP configured.
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-500">
                Add SMTP settings in .env.local to enable sending.
              </span>
            )}
          </CardContent>
        </Card>

        {/* Recent leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent leads</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No leads yet. Run a search once the Finder is wired up
                      (Phase 1).
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.phone ?? "—"}</TableCell>
                      <TableCell>
                        {lead.website ? (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            visit
                          </a>
                        ) : (
                          <span className="text-muted-foreground">none</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{lead.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

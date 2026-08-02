import { AppShell } from "@/components/app-shell";
import { NewSearchForm } from "@/components/new-search-form";
import { AuditButton } from "@/components/audit-button";
import { WriteButton } from "@/components/write-button";
import { BatchButton } from "@/components/batch-button";
import { NextActions } from "@/components/dashboard/next-actions";
import { OutreachWeek } from "@/components/dashboard/outreach-week";
import { PIPELINE_STAGES, type BusinessStatus } from "@/lib/types";
import {
  getStageCounts,
  getBestNextActions,
  getOutreachStats,
  getOutreachDaily,
  getSearches,
  getEmailCounts,
} from "@/lib/queries";
import { isEmailConfigured } from "@/lib/email-sender";
import {
  findEmailsAction,
  writeEmailsAction,
  sendEmailsAction,
} from "@/app/actions/email";

export const dynamic = "force-dynamic";

const STAGE_TONE: Record<BusinessStatus, { text: string; bar: string }> = {
  found: { text: "text-foreground", bar: "bg-foreground" },
  audited: { text: "text-amber-500", bar: "bg-amber-500" },
  drafted: { text: "text-blue-500", bar: "bg-blue-500" },
  queued: { text: "text-blue-500", bar: "bg-blue-500" },
  contacted: { text: "text-foreground", bar: "bg-foreground/70" },
  replied: { text: "text-emerald-500", bar: "bg-emerald-500" },
  interested: { text: "text-emerald-500", bar: "bg-emerald-500" },
  client: { text: "text-emerald-500", bar: "bg-emerald-500" },
  skipped: { text: "text-muted-foreground", bar: "bg-muted-foreground" },
  failed: { text: "text-red-500", bar: "bg-red-500" },
};

export default async function DashboardPage() {
  const [counts, actions, stats, daily, searches, email] = await Promise.all([
    getStageCounts(),
    getBestNextActions(5),
    getOutreachStats(),
    getOutreachDaily(14),
    getSearches(4),
    getEmailCounts(),
  ]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const maxStage = Math.max(
    1,
    ...PIPELINE_STAGES.map((s) => counts[s.key] ?? 0),
  );
  const recent = searches.map((s) => ({
    business_type: s.business_type,
    location: s.location,
  }));

  return (
    <AppShell title="Dashboard" subtitle="Find, audit and pitch local businesses">
      <div className="flex w-full flex-col gap-5">
        <NewSearchForm recent={recent} />

        {/* Pipeline */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="text-sm font-semibold">Pipeline</h2>
            <span className="text-xs text-muted-foreground">
              {total} leads across {searches.length} search
              {searches.length === 1 ? "" : "es"}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <AuditButton pending={counts.found ?? 0} />
              <WriteButton pending={counts.audited ?? 0} />
              <BatchButton
                pending={email.toFind}
                idleLabel={`Find ${email.toFind} emails`}
                runningVerb="Finding emails"
                emptyLabel="Emails found"
                action={findEmailsAction}
              />
              <BatchButton
                pending={email.toDraft}
                idleLabel={`Draft ${email.toDraft}`}
                runningVerb="Drafting emails"
                emptyLabel="Drafted"
                action={writeEmailsAction}
              />
              <BatchButton
                pending={isEmailConfigured() ? email.toSend : 0}
                idleLabel={`Send ${email.toSend}`}
                runningVerb="Sending emails"
                emptyLabel="Send emails"
                action={sendEmailsAction}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {PIPELINE_STAGES.map((stage) => {
              const n = counts[stage.key] ?? 0;
              const tone = STAGE_TONE[stage.key];
              return (
                <div key={stage.key} className="rounded-lg border bg-card p-3">
                  <div className="text-[11px] text-muted-foreground">
                    {stage.label}
                  </div>
                  <div
                    className={`mt-1 text-2xl font-semibold tabular-nums ${tone.text}`}
                  >
                    {n}
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${tone.bar}`}
                      style={{ width: `${(n / maxStage) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Best next actions + Outreach this week */}
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Best next actions</h2>
              <span className="text-xs text-muted-foreground">ranked by fit</span>
            </div>
            <NextActions actions={actions} />
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold">Outreach this week</h2>
            <OutreachWeek stats={stats} daily={daily} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

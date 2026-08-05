import { AppShell } from "@/components/app-shell";
import { getLeadsWithAudits } from "@/lib/queries";
import { LeadsWorkspace } from "@/components/leads/leads-workspace";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await getLeadsWithAudits();

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <span className="text-sm text-muted-foreground">
            {leads.length} total
          </span>
        </div>
        <LeadsWorkspace leads={leads} />
      </div>
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { NewSearchForm } from "@/components/new-search-form";
import { AuditButton } from "@/components/audit-button";
import { WriteButton } from "@/components/write-button";
import { PIPELINE_STAGES } from "@/lib/types";
import { getStageCounts, getRecentLeads } from "@/lib/queries";
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
  const [counts, leads] = await Promise.all([
    getStageCounts(),
    getRecentLeads(),
  ]);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Find, audit, and reach out to local businesses — all in one place.
          </p>
        </div>

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

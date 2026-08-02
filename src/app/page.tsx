import { AppShell } from "@/components/app-shell";
import { NewSearchForm } from "@/components/new-search-form";
import { PIPELINE_STAGES } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Placeholder metrics until Supabase is connected (Phase 1 onward).
const STAGE_COUNTS: Record<string, number> = {};

export default function DashboardPage() {
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
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Pipeline
          </h2>
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
                    {STAGE_COUNTS[stage.key] ?? 0}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent leads (empty until Finder runs) */}
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
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No leads yet. Run a search once the Finder is wired up
                    (Phase 1).
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

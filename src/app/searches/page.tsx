import { AppShell } from "@/components/app-shell";
import { getSearches } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  running: "secondary",
  done: "default",
  failed: "destructive",
} as const;

export default async function SearchesPage() {
  const searches = await getSearches();

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Searches</h1>
          <span className="text-sm text-muted-foreground">
            {searches.length} total
          </span>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">New leads</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searches.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No searches yet. Run one from the dashboard.
                    </TableCell>
                  </TableRow>
                ) : (
                  searches.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.business_type}
                      </TableCell>
                      <TableCell>{s.location}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.results_count}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[s.status]}>
                          {s.status}
                        </Badge>
                        {s.error && (
                          <div className="mt-1 max-w-xs truncate text-xs text-destructive">
                            {s.error}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
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

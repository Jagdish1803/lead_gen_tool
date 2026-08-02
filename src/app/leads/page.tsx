import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAllLeads } from "@/lib/queries";
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

export default async function LeadsPage() {
  const leads = await getAllLeads();

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <span className="text-sm text-muted-foreground">
            {leads.length} total
          </span>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Maps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No leads yet. Run a search from the dashboard.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        <div>{lead.name}</div>
                        {lead.address && (
                          <div className="text-xs text-muted-foreground">
                            {lead.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.category ?? "—"}
                      </TableCell>
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
                          <Badge variant="outline">no website</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {lead.rating != null
                          ? `${lead.rating}${lead.reviews_count ? ` (${lead.reviews_count})` : ""}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{lead.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {lead.maps_url ? (
                          <Link
                            href={lead.maps_url}
                            target="_blank"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            open
                          </Link>
                        ) : (
                          "—"
                        )}
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

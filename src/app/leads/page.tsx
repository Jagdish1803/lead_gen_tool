import { Fragment } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getLeadsWithAudits } from "@/lib/queries";
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

// Human labels for issue codes.
const ISSUE_LABELS: Record<string, string> = {
  no_website: "no website",
  unreachable: "unreachable",
  no_https: "no HTTPS",
  not_mobile_friendly: "not mobile-friendly",
  slow_mobile: "slow on mobile",
  stale_content: "outdated",
  audit_error: "audit error",
};

export default async function LeadsPage() {
  const leads = await getLeadsWithAudits();

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
                  <TableHead>Phone</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Audit</TableHead>
                  <TableHead className="text-right">Speed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No leads yet. Run a search from the dashboard.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => {
                    const issues = lead.issues ?? [];
                    return (
                      <Fragment key={lead.id}>
                      <TableRow>
                        <TableCell className="font-medium">
                          <div>{lead.name}</div>
                          {lead.maps_url && (
                            <Link
                              href={lead.maps_url}
                              target="_blank"
                              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                            >
                              view on maps
                            </Link>
                          )}
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
                        <TableCell className="max-w-xs">
                          {issues.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {issues.map((code) => (
                                <Badge
                                  key={code}
                                  variant={
                                    code === "no_website"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="font-normal"
                                >
                                  {ISSUE_LABELS[code] ?? code}
                                </Badge>
                              ))}
                            </div>
                          ) : lead.audit_summary ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                              looks good
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              not audited
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {lead.pagespeed_mobile != null
                            ? `${lead.pagespeed_mobile}/100`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{lead.status}</Badge>
                        </TableCell>
                      </TableRow>
                      {lead.message_body && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30">
                            <div className="flex items-start gap-2 text-sm">
                              <span className="mt-0.5 shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                                draft
                              </span>
                              <p className="text-foreground/90">
                                {lead.message_body}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

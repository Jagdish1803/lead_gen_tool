import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, ExternalLink, MapPin, Phone } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getLeadDetail } from "@/lib/queries";
import { LeadMessageEditor } from "@/components/lead-message-editor";
import { LeadNotes } from "@/components/lead-notes";
import { LeadStatusSelect } from "@/components/lead-status-select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BusinessStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const CONTACTED: BusinessStatus[] = [
  "contacted",
  "replied",
  "interested",
  "client",
];

const ISSUE_LABELS: Record<string, string> = {
  no_website: "no website",
  unreachable: "unreachable",
  no_https: "no HTTPS",
  not_mobile_friendly: "not mobile-friendly",
  slow_mobile: "slow on mobile",
  stale_content: "outdated",
  audit_error: "audit error",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getLeadDetail(id);
  if (!detail) notFound();

  const { business, audit, messages, events } = detail;
  const waMessage = messages.find(
    (m) => m.channel === "whatsapp" && m.direction === "outbound",
  );
  const contacted = CONTACTED.includes(business.status);

  return (
    <AppShell>
      <div className="flex w-full max-w-5xl flex-col gap-5">
        <Link
          href="/leads"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to leads
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {business.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {business.category && <span>{business.category}</span>}
              {business.rating != null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {business.rating}
                  {business.reviews_count != null &&
                    ` (${business.reviews_count})`}
                </span>
              )}
            </div>
          </div>
          <LeadStatusSelect businessId={business.id} status={business.status} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Business info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {business.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  {business.phone}
                </div>
              )}
              {business.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {business.address}
                </div>
              )}
              {business.website ? (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLink className="size-4" />
                  {business.website}
                </a>
              ) : (
                <Badge variant="outline">no website</Badge>
              )}
              {business.maps_url && (
                <div>
                  <Link
                    href={business.maps_url}
                    target="_blank"
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    view on Google Maps
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Website audit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {audit ? (
                <>
                  <p className="text-muted-foreground">{audit.summary}</p>
                  {(audit.issues?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {audit.issues.map((code) => (
                        <Badge
                          key={code}
                          variant={
                            code === "no_website" ? "default" : "destructive"
                          }
                          className="font-normal"
                        >
                          {ISSUE_LABELS[code] ?? code}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      Mobile speed:{" "}
                      {audit.pagespeed_mobile != null
                        ? `${audit.pagespeed_mobile}/100`
                        : "—"}
                    </span>
                    <span>HTTPS: {audit.https ? "yes" : "no"}</span>
                    <span>Mobile-friendly: {audit.mobile_ok ? "yes" : "no"}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Not audited yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outreach message</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadMessageEditor
              messageId={waMessage?.id ?? null}
              businessId={business.id}
              phone={business.phone}
              initialBody={waMessage?.body ?? ""}
              contacted={contacted}
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadNotes
              businessId={business.id}
              initialNotes={business.notes ?? ""}
            />
          </CardContent>
        </Card>

        {/* Activity */}
        {events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                    <span
                      className={
                        e.level === "error"
                          ? "text-destructive"
                          : e.level === "warn"
                            ? "text-amber-600 dark:text-amber-500"
                            : ""
                      }
                    >
                      <span className="text-muted-foreground">[{e.stage}]</span>{" "}
                      {e.message}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

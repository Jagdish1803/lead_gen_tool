import { AppShell } from "@/components/app-shell";
import { apiGet } from "@/lib/api";
import type { EmailCounts } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface SettingsPayload {
  email: EmailCounts;
  provider: string;
  connections: {
    serpapi: boolean;
    pagespeed: boolean;
    ai: boolean;
    email: boolean;
    emailFrom: string | null;
  };
}

export default async function SettingsPage() {
  const { email, provider, connections } =
    await apiGet<SettingsPayload>("/api/settings");

  const rows = [
    {
      name: "Google Maps (SerpApi)",
      purpose: "Finding businesses",
      ok: connections.serpapi,
      detail: connections.serpapi ? "Connected" : "Not set",
    },
    {
      name: "PageSpeed",
      purpose: "Website speed audit",
      ok: connections.pagespeed,
      detail: connections.pagespeed ? "Connected" : "Not set (speed skipped)",
    },
    {
      name: "AI writer",
      purpose: "Writing messages",
      ok: connections.ai,
      detail: connections.ai ? `Connected (${provider})` : "Not set (templates only)",
    },
    {
      name: "Email (SMTP)",
      purpose: "Automated email outreach",
      ok: connections.email,
      detail: connections.email ? (connections.emailFrom ?? "Connected") : "Not set",
    },
  ];

  return (
    <AppShell>
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

        {/* Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connections</CardTitle>
            <CardDescription>
              Configured on the backend (VPS <code>.env.local</code>). Restart
              the backend after changing keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {rows.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    <span
                      className={`size-2 rounded-full ${c.ok ? "bg-emerald-500" : "bg-amber-500"}`}
                    />
                    {c.name}
                  </div>
                  <div className="pl-4 text-sm text-muted-foreground">
                    {c.purpose}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{c.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outreach channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email</div>
                <div className="text-muted-foreground">
                  Automated — sends from your configured address.
                </div>
              </div>
              <span className="text-muted-foreground">
                {email.sent} sent · {email.toSend} queued
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">WhatsApp</div>
                <div className="text-muted-foreground">
                  Manual — tap the button on a lead to send from your own number
                  (safe, no ban risk).
                </div>
              </div>
              <Badge variant="secondary">manual</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

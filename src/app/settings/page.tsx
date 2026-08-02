import QRCode from "qrcode";
import { AppShell } from "@/components/app-shell";
import { AutoRefresh } from "@/components/auto-refresh";
import { SendingToggle } from "@/components/sending-toggle";
import { PacingForm } from "@/components/pacing-form";
import {
  getAppSettings,
  getWhatsAppState,
  getQueuedCount,
} from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  connected: { label: "Connected", variant: "default" },
  qr: { label: "Waiting for scan", variant: "secondary" },
  connecting: { label: "Connecting…", variant: "secondary" },
  disconnected: { label: "Disconnected", variant: "outline" },
};

export default async function SettingsPage() {
  const [settings, state, queued] = await Promise.all([
    getAppSettings(),
    getWhatsAppState(),
    getQueuedCount(),
  ]);

  const isConnected = state.status === "connected";
  const qrDataUrl =
    state.status === "qr" && state.qr
      ? await QRCode.toDataURL(state.qr, { margin: 1, width: 240 })
      : null;
  const meta = STATUS_META[state.status] ?? STATUS_META.disconnected;

  // Refresh often while pairing/connecting; calmly once connected.
  const staleWorker =
    Date.now() - new Date(state.updated_at).getTime() > 60_000;

  return (
    <AppShell>
      <AutoRefresh seconds={isConnected ? 8 : 4} />
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

        {/* WhatsApp connection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>WhatsApp connection</CardTitle>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>
            <CardDescription>
              Runs via the worker process. Use a dedicated number you&apos;re OK
              risking — never your personal line.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected && (
              <p className="text-sm">
                Linked as{" "}
                <span className="font-medium">{state.phone ?? "unknown"}</span>.
                Sent today:{" "}
                <span className="font-medium tabular-nums">
                  {state.sent_today}
                </span>{" "}
                / {settings.daily_cap}.
              </p>
            )}

            {qrDataUrl && (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="WhatsApp QR code"
                  className="rounded-md border bg-white p-2"
                  width={240}
                  height={240}
                />
                <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                  <li>Open WhatsApp on the dedicated phone</li>
                  <li>Settings → Linked Devices → Link a device</li>
                  <li>Scan this code</li>
                </ol>
              </div>
            )}

            {!isConnected && !qrDataUrl && (
              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                <p className="mb-2">
                  The worker isn&apos;t reporting a connection yet. Start it on
                  your machine / VPS:
                </p>
                <pre className="overflow-x-auto rounded bg-background p-2 font-mono text-xs">
                  npm run worker
                </pre>
                <p className="mt-2">
                  A QR code will appear here (and in the terminal) to scan.
                </p>
                {staleWorker && (
                  <p className="mt-2 text-amber-600 dark:text-amber-500">
                    Worker looks offline (no recent heartbeat).
                  </p>
                )}
              </div>
            )}

            {state.last_error && (
              <p className="text-xs text-destructive">
                Last error: {state.last_error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sending controls */}
        <Card>
          <CardHeader>
            <CardTitle>Sending</CardTitle>
            <CardDescription>
              {queued} message{queued === 1 ? "" : "s"} currently queued.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SendingToggle
              enabled={settings.sending_enabled}
              canSend={isConnected}
            />
            <div>
              <h3 className="mb-1 text-sm font-medium">Pacing</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Sends one message per randomized gap, up to the daily cap. Slow
                and human-like keeps the number safe.
              </p>
              <PacingForm
                minDelaySec={settings.min_delay_sec}
                maxDelaySec={settings.max_delay_sec}
                dailyCap={settings.daily_cap}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

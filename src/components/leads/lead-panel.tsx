"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  X,
  Star,
  Send,
  Mail,
  Phone,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { LeadDetail } from "@/lib/queries";
import type { BusinessStatus } from "@/lib/types";
import { waMeLink } from "@/lib/phone";
import { markContactedAction } from "@/app/actions/contact";
import { updateNotesAction, updateStatusAction } from "@/app/actions/lead";
import { parseArea, STATUS_STYLES } from "@/components/leads/lead-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES: BusinessStatus[] = [
  "found",
  "audited",
  "drafted",
  "queued",
  "contacted",
  "replied",
  "interested",
  "client",
];

const ISSUE_LABELS: Record<string, string> = {
  no_website: "No website",
  unreachable: "Website unreachable",
  no_https: "No HTTPS / SSL",
  not_mobile_friendly: "Not mobile-friendly",
  slow_mobile: "Slow on mobile",
  stale_content: "Outdated design",
  no_click_to_call: "No click-to-call number",
  no_booking_form: "No booking / enquiry form",
};

function Dot({ ok }: { ok: boolean | null }) {
  return (
    <span
      className={`size-1.5 rounded-full ${
        ok === true
          ? "bg-emerald-500"
          : ok === false
            ? "bg-red-500"
            : "bg-amber-500"
      }`}
    />
  );
}

export function LeadPanel({
  leadId,
  onClose,
}: {
  leadId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/leads/${leadId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.ok) {
          setDetail(d.detail);
          setNotes(d.detail.business.notes ?? "");
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [leadId]);

  const b = detail?.business;
  const audit = detail?.audit;
  const waMsg = detail?.messages.find(
    (m) => m.channel === "whatsapp" && m.direction === "outbound",
  );
  const emailMsg = detail?.messages.find(
    (m) => m.channel === "email" && m.direction === "outbound",
  );

  function sendWhatsApp() {
    if (!b) return;
    const link = waMeLink(b.phone, waMsg?.body ?? "");
    if (!link) return toast.error("No phone number");
    window.open(link, "_blank", "noopener");
    // Don't auto-mark — only mark contacted once the user confirms they sent it.
    toast("Opened WhatsApp", {
      description: "Send it, then mark this lead as contacted.",
      action: {
        label: "Mark sent",
        onClick: () =>
          startTransition(async () => {
            await markContactedAction(b.id);
            router.refresh();
          }),
      },
    });
  }

  function sendEmail() {
    if (!b?.email) return toast.error("No email for this lead");
    const subject = encodeURIComponent(emailMsg?.subject ?? "");
    const body = encodeURIComponent(emailMsg?.body ?? "");
    window.open(`mailto:${b.email}?subject=${subject}&body=${body}`, "_blank");
  }

  function saveNotes() {
    if (!b) return;
    startTransition(async () => {
      const res = await updateNotesAction(b.id, notes);
      if (res.ok) toast.success("Notes saved");
      else toast.error(res.error);
    });
  }

  function changeStatus(next: string | null) {
    if (!b || !next) return;
    const status = next as BusinessStatus;
    startTransition(async () => {
      const res = await updateStatusAction(b.id, status);
      if (res.ok) {
        setDetail((d) =>
          d ? { ...d, business: { ...d.business, status } } : d,
        );
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      {/* Panel */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l bg-background text-[13px] shadow-2xl">
        {loading || !b ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">{b.name}</h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-muted-foreground">
                  {b.rating != null && (
                    <span className="inline-flex items-center gap-0.5">
                      {b.rating}
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                    </span>
                  )}
                  {parseArea(b.address) && <span>· {parseArea(b.address)}</span>}
                  {b.website && (
                    <span className="font-mono text-[12px]">
                      · {b.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={sendWhatsApp}
                disabled={isPending || !b.phone}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="size-4" /> WhatsApp
              </button>
              <button
                onClick={sendEmail}
                disabled={!b.email || b.email === ""}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Mail className="size-4" /> Email
              </button>
              {b.phone && (
                <a
                  href={`tel:${b.phone}`}
                  className="flex items-center justify-center gap-1.5 rounded-md border px-4 py-2 font-medium hover:bg-accent"
                >
                  <Phone className="size-4" /> Call
                </a>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status</span>
              <Select
                value={b.status}
                onValueChange={changeStatus}
                disabled={isPending}
              >
                <SelectTrigger
                  size="sm"
                  className={`h-7 w-[150px] border-0 text-xs font-medium capitalize ${STATUS_STYLES[b.status]}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Site audit */}
            <section>
              <h3 className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                Site audit
              </h3>
              {audit ? (
                <div className="space-y-2">
                  <Row
                    dot={
                      audit.load_time_sec == null
                        ? null
                        : audit.load_time_sec <= 3
                    }
                    label="Mobile load time"
                    value={
                      audit.load_time_sec != null
                        ? `${audit.load_time_sec}s`
                        : audit.pagespeed_mobile != null
                          ? `${audit.pagespeed_mobile}/100`
                          : "not measured"
                    }
                  />
                  <Row
                    dot={audit.has_click_to_call}
                    label="Click-to-call number"
                    value={
                      audit.has_click_to_call == null
                        ? "—"
                        : audit.has_click_to_call
                          ? "present"
                          : "missing"
                    }
                  />
                  <Row
                    dot={audit.has_form}
                    label="Booking / enquiry form"
                    value={
                      audit.has_form == null
                        ? "—"
                        : audit.has_form
                          ? "present"
                          : "none"
                    }
                  />
                  <Row dot={audit.https} label="SSL certificate" value={audit.https ? "valid" : "missing"} />
                  <Row
                    dot={audit.mobile_ok}
                    label="Mobile-friendly"
                    value={audit.mobile_ok ? "yes" : "no"}
                  />
                  {(audit.issues ?? []).length > 0 && (
                    <div className="pt-1">
                      {audit.issues.map((code) => (
                        <div
                          key={code}
                          className="flex items-center gap-2 py-0.5 text-muted-foreground"
                        >
                          <span className="size-1.5 rounded-full bg-red-500" />
                          {ISSUE_LABELS[code] ?? code}
                        </div>
                      ))}
                    </div>
                  )}
                  {audit.summary && (
                    <p className="pt-1 text-muted-foreground">{audit.summary}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Not audited yet.</p>
              )}
            </section>

            {/* Contact */}
            <section>
              <h3 className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                Contact
              </h3>
              <div className="space-y-1.5">
                <ContactRow label="Phone" value={b.phone} />
                <ContactRow label="WhatsApp" value={b.phone} />
                <ContactRow
                  label="Email"
                  value={b.email && b.email !== "" ? b.email : null}
                />
                <ContactRow
                  label="Website"
                  value={b.website}
                  href={b.website ?? undefined}
                />
              </div>
            </section>

            {/* Notes */}
            <section>
              <h3 className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                Notes
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="What you noticed, what they said on the call…"
                className="w-full resize-y rounded-md border bg-transparent p-2.5 outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {notes !== (b.notes ?? "") && (
                <button
                  onClick={saveNotes}
                  disabled={isPending}
                  className="mt-2 rounded-md border px-3 py-1 hover:bg-accent"
                >
                  Save notes
                </button>
              )}
            </section>

            {/* Activity */}
            {detail && detail.events.length > 0 && (
              <section>
                <h3 className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Activity
                </h3>
                <ul className="space-y-1.5">
                  {detail.events.map((e) => (
                    <li key={e.id} className="flex gap-3 text-muted-foreground">
                      <span className="w-10 shrink-0 text-[11px]">
                        {new Date(e.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className={e.level === "error" ? "text-red-400" : ""}>
                        {e.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

function Row({
  dot,
  label,
  value,
}: {
  dot: boolean | null;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <Dot ok={dot} />
        {label}
      </span>
      <span className="font-mono text-[12px] text-muted-foreground">{value}</span>
    </div>
  );
}

function ContactRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      {value ? (
        href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[12px] text-sky-400 hover:underline"
          >
            {value.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="font-mono text-[12px]">{value}</span>
        )
      ) : (
        <span className="text-muted-foreground/50">—</span>
      )}
    </div>
  );
}

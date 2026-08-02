"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { NextAction } from "@/lib/queries";
import { waMeLink } from "@/lib/phone";
import { markContactedAction } from "@/app/actions/contact";
import { parseArea } from "@/components/leads/lead-utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function NextActions({ actions }: { actions: NextAction[] }) {
  const [, startTransition] = useTransition();
  const router = useRouter();

  if (actions.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        Nothing queued yet. Run a search and audit to surface leads here.
      </p>
    );
  }

  function whatsapp(a: NextAction) {
    const link = waMeLink(a.phone, a.wa_body ?? "");
    if (!link) return toast.error("No phone number");
    window.open(link, "_blank", "noopener");
    startTransition(async () => {
      await markContactedAction(a.id);
      router.refresh();
    });
  }

  function email(a: NextAction) {
    if (!a.email) return toast.error("No email");
    const s = encodeURIComponent(a.email_subject ?? "");
    const b = encodeURIComponent(a.email_body ?? "");
    window.open(`mailto:${a.email}?subject=${s}&body=${b}`, "_blank");
  }

  return (
    <div className="divide-y">
      {actions.map((a) => (
        <div key={a.id} className="flex items-center gap-3 py-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
            {initials(a.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{a.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {a.issue_count} site issue{a.issue_count === 1 ? "" : "s"}
              {a.rating != null && ` · ${a.rating}★`}
              {parseArea(a.address) && ` · ${parseArea(a.address)}`}
            </div>
          </div>
          <button
            onClick={() => whatsapp(a)}
            disabled={!a.phone}
            className="rounded-md border px-3 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-40 dark:text-emerald-400"
          >
            WhatsApp
          </button>
          <button
            onClick={() => email(a)}
            disabled={!a.email || a.email === ""}
            className="rounded-md border px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-500/10 disabled:opacity-40 dark:text-blue-400"
          >
            Email
          </button>
        </div>
      ))}
    </div>
  );
}

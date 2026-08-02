"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Check, RotateCcw } from "lucide-react";
import { waMeLink } from "@/lib/phone";
import {
  markContactedAction,
  unmarkContactedAction,
} from "@/app/actions/contact";
import { Button } from "@/components/ui/button";

export function WhatsAppSendButton({
  businessId,
  phone,
  message,
  contacted,
}: {
  businessId: string;
  phone: string | null;
  message: string | null;
  contacted: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const link = message ? waMeLink(phone, message) : null;

  function send() {
    if (!link) return;
    // Open WhatsApp (Web/app) with the message pre-filled, then track it.
    window.open(link, "_blank", "noopener");
    startTransition(async () => {
      const res = await markContactedAction(businessId);
      if (res.ok) {
        toast.success("Marked contacted", {
          description: "Hit send in WhatsApp to actually deliver it.",
        });
        router.refresh();
      } else {
        toast.error("Couldn't update", { description: res.error });
      }
    });
  }

  function undo() {
    startTransition(async () => {
      const res = await unmarkContactedAction(businessId);
      if (res.ok) router.refresh();
      else toast.error("Couldn't undo", { description: res.error });
    });
  }

  if (!phone || !message) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (contacted) {
    return (
      <div className="flex items-center gap-1">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="size-3.5" /> sent
        </span>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            reopen
          </a>
        )}
        <button
          onClick={undo}
          disabled={isPending}
          className="text-muted-foreground hover:text-foreground"
          title="Undo"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      onClick={send}
      disabled={isPending}
      className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
    >
      <Send className="size-3.5" />
      WhatsApp
    </Button>
  );
}

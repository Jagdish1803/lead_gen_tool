"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Copy, Save } from "lucide-react";
import { waMeLink } from "@/lib/phone";
import { updateMessageAction } from "@/app/actions/lead";
import { markContactedAction } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";

export function LeadMessageEditor({
  messageId,
  businessId,
  phone,
  initialBody,
  contacted,
}: {
  messageId: string | null;
  businessId: string;
  phone: string | null;
  initialBody: string;
  contacted: boolean;
}) {
  const [body, setBody] = useState(initialBody);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const dirty = body !== initialBody;

  function save() {
    if (!messageId) return;
    startTransition(async () => {
      const res = await updateMessageAction(messageId, body);
      if (res.ok) {
        toast.success("Message saved");
        router.refresh();
      } else {
        toast.error("Couldn't save", { description: res.error });
      }
    });
  }

  function sendWhatsApp() {
    const link = waMeLink(phone, body);
    if (!link) {
      toast.error("No phone number for this lead");
      return;
    }
    window.open(link, "_blank", "noopener");
    startTransition(async () => {
      await markContactedAction(businessId);
      toast.success("Opened WhatsApp — marked contacted");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="w-full resize-y rounded-md border bg-transparent p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        placeholder="No message drafted yet."
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={sendWhatsApp}
          disabled={isPending || !phone || !body.trim()}
          className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Send className="size-4" />
          {contacted ? "Send again on WhatsApp" : "Send on WhatsApp"}
        </Button>
        <Button
          variant="outline"
          onClick={save}
          disabled={isPending || !dirty || !messageId}
          className="gap-1.5"
        >
          <Save className="size-4" />
          {dirty ? "Save edit" : "Saved"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(body);
            toast.success("Copied");
          }}
          className="gap-1.5"
        >
          <Copy className="size-4" />
          Copy
        </Button>
      </div>
    </div>
  );
}

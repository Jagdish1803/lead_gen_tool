"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleSendingAction } from "@/app/actions/settings";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function SendingToggle({
  enabled,
  canSend,
}: {
  enabled: boolean;
  canSend: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function change(next: boolean) {
    setOn(next);
    startTransition(async () => {
      const res = await toggleSendingAction(next);
      if (!res.ok) {
        setOn(!next);
        toast.error("Couldn't update", { description: res.error });
        return;
      }
      toast[next ? "success" : "info"](
        next ? "Sending ON — messages will go out on schedule" : "Sending paused",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <Label className="text-base">Automatic sending</Label>
        <p className="text-sm text-muted-foreground">
          {on
            ? "Queued messages send automatically at the paced rate."
            : "Master switch is off — nothing will be sent."}
        </p>
        {!canSend && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            Connect a WhatsApp number first (below) before turning this on.
          </p>
        )}
      </div>
      <Switch
        checked={on}
        onCheckedChange={change}
        disabled={isPending}
        aria-label="Toggle automatic sending"
      />
    </div>
  );
}

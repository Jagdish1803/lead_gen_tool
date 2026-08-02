"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { BatchResult } from "@/app/actions/email";
import { Button } from "@/components/ui/button";

/**
 * Generic "process pending items in batches" button. Calls the action
 * repeatedly until nothing is left, showing live progress.
 */
export function BatchButton({
  pending,
  idleLabel,
  runningVerb,
  emptyLabel,
  action,
}: {
  pending: number;
  idleLabel: string; // e.g. "Find 40 emails"
  runningVerb: string; // e.g. "Finding emails"
  emptyLabel: string; // e.g. "Emails found"
  action: () => Promise<BatchResult>;
}) {
  const [running, setRunning] = useState(false);
  const router = useRouter();

  async function run() {
    if (running || pending === 0) return;
    setRunning(true);
    const toastId = toast.loading(`${runningVerb}…`);
    let done = 0;
    try {
      for (let guard = 0; guard < 500; guard++) {
        const res = await action();
        if (!res.ok) {
          toast.error("Failed", { id: toastId, description: res.error });
          break;
        }
        done += res.done;
        if (res.remaining === 0 && res.done === 0) {
          toast.success(`Done — ${done} processed`, {
            id: toastId,
            description: res.note,
          });
          break;
        }
        toast.loading(`${runningVerb}… ${done} done, ${res.remaining} to go`, {
          id: toastId,
        });
        router.refresh();
      }
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={run}
      disabled={running || pending === 0}
      className="gap-1.5"
    >
      {running && <Loader2 className="size-4 animate-spin" />}
      {pending > 0 ? idleLabel : emptyLabel}
    </Button>
  );
}

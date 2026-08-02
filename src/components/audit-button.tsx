"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Stethoscope, Loader2 } from "lucide-react";
import { runAuditBatchAction } from "@/app/actions/audit";
import { Button } from "@/components/ui/button";

export function AuditButton({ pending }: { pending: number }) {
  const [running, setRunning] = useState(false);
  const router = useRouter();

  async function run() {
    if (running || pending === 0) return;
    setRunning(true);
    const toastId = toast.loading(`Auditing ${pending} leads…`, {
      description: "Checking websites for issues.",
    });

    let done = 0;
    try {
      // Loop batches until nothing is left to audit.
      for (let guard = 0; guard < 500; guard++) {
        const result = await runAuditBatchAction(8);
        if (!result.ok) {
          toast.error("Audit failed", {
            id: toastId,
            description: result.error,
          });
          break;
        }
        done += result.data.audited;
        const { remaining } = result.data;
        if (remaining === 0 && result.data.audited === 0) {
          toast.success(`Audited ${done} lead${done === 1 ? "" : "s"}`, {
            id: toastId,
            description: "See issues on the Leads page.",
          });
          break;
        }
        toast.loading(`Audited ${done}… (${remaining} to go)`, {
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
      className="gap-2"
      onClick={run}
      disabled={running || pending === 0}
    >
      {running ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Stethoscope className="size-4" />
      )}
      {pending > 0 ? `Audit ${pending} pending` : "All audited"}
    </Button>
  );
}

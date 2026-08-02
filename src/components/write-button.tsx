"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine, Loader2 } from "lucide-react";
import { runWriteBatchAction } from "@/app/actions/write";
import { Button } from "@/components/ui/button";

export function WriteButton({ pending }: { pending: number }) {
  const [running, setRunning] = useState(false);
  const router = useRouter();

  async function run() {
    if (running || pending === 0) return;
    setRunning(true);
    const toastId = toast.loading(`Drafting ${pending} messages…`);

    let done = 0;
    try {
      for (let guard = 0; guard < 500; guard++) {
        const result = await runWriteBatchAction(8);
        if (!result.ok) {
          toast.error("Writing failed", {
            id: toastId,
            description: result.error,
          });
          break;
        }
        done += result.data.written;
        const { remaining } = result.data;
        if (remaining === 0 && result.data.written === 0) {
          toast.success(`Drafted ${done} message${done === 1 ? "" : "s"}`, {
            id: toastId,
            description: "Review them on the Leads page.",
          });
          break;
        }
        toast.loading(`Drafted ${done}… (${remaining} to go)`, { id: toastId });
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
        <PenLine className="size-4" />
      )}
      {pending > 0 ? `Write ${pending} drafts` : "All drafted"}
    </Button>
  );
}

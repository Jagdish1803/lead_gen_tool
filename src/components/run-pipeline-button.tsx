"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Loader2 } from "lucide-react";

export function RunPipelineButton({ pending }: { pending: number }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/pipeline/start", { method: "POST" });
      const d = await res.json();
      if (d.ok) {
        toast.success("Pipeline running in the background");
        router.refresh();
      }
    } catch {
      toast.error("Couldn't start the pipeline");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Play className="size-3.5" />
      )}
      {pending > 0 ? `Run pipeline (${pending} pending)` : "Run pipeline"}
    </button>
  );
}

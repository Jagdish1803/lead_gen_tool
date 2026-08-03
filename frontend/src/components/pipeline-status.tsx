"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";

interface Progress {
  running: boolean;
  stage: string;
  done: number;
  total: number;
  note: string | null;
  finishedAt: number | null;
}

export function PipelineStatus() {
  const [p, setP] = useState<Progress | null>(null);
  const [showDone, setShowDone] = useState(false);
  const wasRunning = useRef(false);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    let tick = 0;
    async function poll() {
      try {
        const r = await fetch("/api/pipeline/status", { cache: "no-store" });
        const d: Progress = await r.json();
        if (!alive) return;
        setP(d);
        if (d.running) {
          wasRunning.current = true;
          setShowDone(false);
          if (tick++ % 4 === 0) router.refresh();
        } else if (wasRunning.current) {
          wasRunning.current = false;
          setShowDone(true);
          if (doneTimer.current) clearTimeout(doneTimer.current);
          doneTimer.current = setTimeout(() => setShowDone(false), 10_000);
          router.refresh();
        }
      } catch {
        /* ignore */
      }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => {
      alive = false;
      clearInterval(id);
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, [router]);

  if (p?.running) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary">
        <Loader2 className="size-4 animate-spin" />
        <span className="font-medium">{p.stage}</span>
        {p.total > 0 && (
          <span className="tabular-nums text-muted-foreground">
            {p.done}/{p.total}
          </span>
        )}
        <span className="text-muted-foreground">
          · runs in the background — you can close this tab
        </span>
        {p.note && (
          <span className="text-xs text-amber-600 dark:text-amber-500">
            {p.note}
          </span>
        )}
      </div>
    );
  }

  if (showDone) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-4" />
        Pipeline finished — audited, drafted, and emails sent.
      </div>
    );
  }

  return null;
}

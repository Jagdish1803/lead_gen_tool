"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePacingAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PacingForm({
  minDelaySec,
  maxDelaySec,
  dailyCap,
}: {
  minDelaySec: number;
  maxDelaySec: number;
  dailyCap: number;
}) {
  // Show delays in minutes for friendliness; store as seconds.
  const [minMin, setMinMin] = useState(Math.round(minDelaySec / 60));
  const [maxMin, setMaxMin] = useState(Math.round(maxDelaySec / 60));
  const [cap, setCap] = useState(dailyCap);
  const [isPending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePacingAction({
        minDelaySec: minMin * 60,
        maxDelaySec: maxMin * 60,
        dailyCap: cap,
      });
      if (res.ok) toast.success("Pacing saved");
      else toast.error("Couldn't save", { description: res.error });
    });
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      <div className="space-y-2">
        <Label htmlFor="min">Min gap (minutes)</Label>
        <Input
          id="min"
          type="number"
          min={1}
          value={minMin}
          onChange={(e) => setMinMin(Number(e.target.value))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="max">Max gap (minutes)</Label>
        <Input
          id="max"
          type="number"
          min={1}
          value={maxMin}
          onChange={(e) => setMaxMin(Number(e.target.value))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cap">Daily cap</Label>
        <Input
          id="cap"
          type="number"
          min={1}
          value={cap}
          onChange={(e) => setCap(Number(e.target.value))}
        />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save pacing"}
        </Button>
      </div>
    </form>
  );
}

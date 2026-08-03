"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateNotesAction } from "@/app/actions/lead";
import { Button } from "@/components/ui/button";

export function LeadNotes({
  businessId,
  initialNotes,
}: {
  businessId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();
  const dirty = notes !== initialNotes;

  function save() {
    startTransition(async () => {
      const res = await updateNotesAction(businessId, notes);
      if (res.ok) toast.success("Notes saved");
      else toast.error("Couldn't save", { description: res.error });
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        className="w-full resize-y rounded-md border bg-transparent p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        placeholder="Add notes about this lead — call outcomes, follow-ups, anything."
      />
      <Button onClick={save} disabled={isPending || !dirty} variant="outline">
        {dirty ? "Save notes" : "Saved"}
      </Button>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateStatusAction } from "@/app/actions/lead";
import { PIPELINE_STAGES, type BusinessStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LeadStatusSelect({
  businessId,
  status,
}: {
  businessId: string;
  status: BusinessStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function change(next: string | null) {
    if (!next) return;
    startTransition(async () => {
      const res = await updateStatusAction(businessId, next as BusinessStatus);
      if (res.ok) {
        toast.success(`Moved to "${next}"`);
        router.refresh();
      } else {
        toast.error("Couldn't update", { description: res.error });
      }
    });
  }

  return (
    <Select value={status} onValueChange={change} disabled={isPending}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PIPELINE_STAGES.map((s) => (
          <SelectItem key={s.key} value={s.key}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

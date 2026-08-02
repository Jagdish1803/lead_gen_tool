"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateStatusAction } from "@/app/actions/lead";
import type { BusinessStatus } from "@/lib/types";
import { STATUS_STYLES } from "@/components/leads/lead-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES: BusinessStatus[] = [
  "found",
  "audited",
  "drafted",
  "queued",
  "contacted",
  "replied",
  "interested",
  "client",
];

export function RowStatusSelect({
  id,
  status,
}: {
  id: string;
  status: BusinessStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function change(next: string | null) {
    if (!next || next === status) return;
    startTransition(async () => {
      const res = await updateStatusAction(id, next as BusinessStatus);
      if (res.ok) router.refresh();
      else toast.error(res.error);
    });
  }

  return (
    // Stop the click from opening the row's slide-over panel.
    <span onClick={(e) => e.stopPropagation()}>
      <Select value={status} onValueChange={change} disabled={isPending}>
        <SelectTrigger
          size="sm"
          className={`h-6 w-[112px] border-0 text-[11px] font-medium capitalize ${STATUS_STYLES[status]}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}

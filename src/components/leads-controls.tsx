"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "no_website", label: "No website" },
  { key: "has_issues", label: "Has issues" },
  { key: "not_contacted", label: "Not contacted" },
  { key: "contacted", label: "Contacted" },
];

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "rating", label: "Rating (high→low)" },
  { key: "reviews", label: "Most reviews" },
  { key: "name", label: "Name (A→Z)" },
];

export function LeadsControls({
  sort,
  filter,
}: {
  sort: string;
  filter: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`/leads?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => update("filter", f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort</span>
        <Select
          value={sort}
          onValueChange={(v) => v && update("sort", v)}
        >
          <SelectTrigger className="w-[180px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

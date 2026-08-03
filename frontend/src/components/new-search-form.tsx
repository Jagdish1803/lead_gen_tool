"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { runSearchAction } from "@/app/actions/search";

export function NewSearchForm({
  recent = [],
}: {
  recent?: { business_type: string; location: string }[];
}) {
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessType.trim() || !location.trim()) {
      toast.error("Enter both a business type and a location.");
      return;
    }
    startTransition(async () => {
      const result = await runSearchAction(businessType, location);
      if (result.ok) {
        toast.success(`Found ${result.data.inserted} leads`, {
          description:
            "The pipeline is now running in the background — auditing, writing, and emailing automatically.",
        });
        router.refresh();
      } else {
        toast.error("Search failed", { description: result.error });
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold">Find businesses on Google Maps</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Enter a type + location — it finds them, then audits, writes, and
        auto-sends the emails in the background. You just send the WhatsApps.
      </p>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          disabled={isPending}
          placeholder="Dental clinic"
          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={isPending}
          placeholder="Andheri, Mumbai"
          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Search
        </button>
      </form>

      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Recent</span>
          {recent.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                setBusinessType(r.business_type);
                setLocation(r.location);
              }}
              className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {r.business_type} · {r.location}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

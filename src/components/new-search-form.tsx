"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { runSearchAction } from "@/app/actions/search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function NewSearchForm() {
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessType.trim() || !location.trim()) {
      toast.error("Enter both a business type and a location.");
      return;
    }

    startTransition(async () => {
      const result = await runSearchAction(businessType, location);
      if (result.ok) {
        const { fetched, inserted, pages } = result.data;
        toast.success(`Saved ${inserted} new business${inserted === 1 ? "" : "es"}`, {
          description: `Found ${fetched} results across ${pages} page${pages === 1 ? "" : "s"} (${pages} SerpApi search${pages === 1 ? "" : "es"} used).`,
        });
        router.refresh();
      } else {
        toast.error("Search failed", { description: result.error });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find businesses</CardTitle>
        <CardDescription>
          Enter a business type and a location. The finder pulls matching
          businesses from Google Maps (up to ~60 per search).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="business-type">Business type</Label>
            <Input
              id="business-type"
              placeholder="Dental Clinic"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Mumbai"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isPending}
            />
          </div>
          <Button type="submit" className="gap-2" disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            {isPending ? "Searching…" : "Search"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

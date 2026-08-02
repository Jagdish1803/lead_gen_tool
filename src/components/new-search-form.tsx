"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Phase 1 will wire this to the SerpApi Finder. For now, just confirm UX.
    toast.info("Finder coming in Phase 1", {
      description: `Would search: ${businessType || "…"} in ${location || "…"}`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find businesses</CardTitle>
        <CardDescription>
          Enter a business type and a location. The finder will pull matching
          businesses from Google Maps.
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
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Mumbai"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <Button type="submit" className="gap-2">
            <Search className="size-4" />
            Search
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

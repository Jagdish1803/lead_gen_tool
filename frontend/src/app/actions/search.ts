"use server";

import { apiPost } from "@/lib/api";

export type FinderResult = { inserted: number } & Record<string, unknown>;

export type SearchActionResult =
  | { ok: true; data: FinderResult }
  | { ok: false; error: string };

export async function runSearchAction(
  businessType: string,
  location: string,
): Promise<SearchActionResult> {
  const type = businessType.trim();
  const loc = location.trim();
  if (!type || !loc) {
    return { ok: false, error: "Enter both a business type and a location." };
  }
  try {
    return await apiPost<SearchActionResult>("/api/search", {
      businessType: type,
      location: loc,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { runFinder, type FinderResult } from "@/lib/finder";

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
    const data = await runFinder({ businessType: type, location: loc });
    revalidatePath("/");
    revalidatePath("/leads");
    revalidatePath("/searches");
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

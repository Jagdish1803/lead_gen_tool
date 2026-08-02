"use server";

import { revalidatePath } from "next/cache";
import { runWriter, type WriteRunResult } from "@/lib/writer";

export type WriteActionResult =
  | { ok: true; data: WriteRunResult }
  | { ok: false; error: string };

/** Drafts messages for one batch of audited leads. Client loops until done. */
export async function runWriteBatchAction(
  limit = 8,
): Promise<WriteActionResult> {
  try {
    const data = await runWriter({ limit });
    revalidatePath("/");
    revalidatePath("/leads");
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

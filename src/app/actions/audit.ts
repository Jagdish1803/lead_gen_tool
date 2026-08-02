"use server";

import { revalidatePath } from "next/cache";
import { runAuditor, type AuditRunResult } from "@/lib/auditor";

export type AuditActionResult =
  | { ok: true; data: AuditRunResult }
  | { ok: false; error: string };

/**
 * Audits one batch of pending leads. The client calls this repeatedly until
 * `remaining` reaches 0, so each request stays short and shows live progress.
 */
export async function runAuditBatchAction(
  limit = 8,
): Promise<AuditActionResult> {
  try {
    const data = await runAuditor({ limit });
    revalidatePath("/");
    revalidatePath("/leads");
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

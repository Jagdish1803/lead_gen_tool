"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import type { BusinessStatus } from "@/lib/types";

export type LeadActionResult = { ok: true } | { ok: false; error: string };

/** Edit a drafted message body before sending. */
export async function updateMessageAction(
  messageId: string,
  body: string,
): Promise<LeadActionResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Message can't be empty." };
  try {
    await sql`update messages set body = ${text} where id = ${messageId}`;
    revalidatePath("/leads");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Save freeform notes on a lead. */
export async function updateNotesAction(
  businessId: string,
  notes: string,
): Promise<LeadActionResult> {
  try {
    await sql`update businesses set notes = ${notes} where id = ${businessId}`;
    revalidatePath("/leads");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Manually move a lead to a different pipeline stage. */
export async function updateStatusAction(
  businessId: string,
  status: BusinessStatus,
): Promise<LeadActionResult> {
  try {
    await sql`update businesses set status = ${status} where id = ${businessId}`;
    revalidatePath("/leads");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

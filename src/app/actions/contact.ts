"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

export type ContactActionResult = { ok: true } | { ok: false; error: string };

/**
 * Mark a lead as contacted after you manually send the WhatsApp message.
 * Flips the queued outbound message to 'sent' and the business to 'contacted'.
 */
export async function markContactedAction(
  businessId: string,
): Promise<ContactActionResult> {
  try {
    await sql`
      update messages
      set status = 'sent', sent_at = now()
      where business_id = ${businessId}
        and direction = 'outbound' and status = 'queued'
    `;
    await sql`
      update businesses set status = 'contacted' where id = ${businessId}
    `;
    await sql`
      insert into events (business_id, stage, level, message)
      values (${businessId}, 'sender', 'info', 'Marked contacted (manual WhatsApp)')
    `;
    revalidatePath("/");
    revalidatePath("/leads");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Undo a contacted mark (back to drafted / queued) in case of a misclick. */
export async function unmarkContactedAction(
  businessId: string,
): Promise<ContactActionResult> {
  try {
    await sql`
      update messages set status = 'queued', sent_at = null
      where business_id = ${businessId}
        and direction = 'outbound' and status = 'sent'
    `;
    await sql`
      update businesses set status = 'drafted' where id = ${businessId}
    `;
    revalidatePath("/");
    revalidatePath("/leads");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

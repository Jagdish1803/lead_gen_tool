"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { refreshContactStatus } from "@/lib/contact-status";

export type ContactActionResult = { ok: true } | { ok: false; error: string };

/**
 * Mark the WhatsApp message as sent (after you send it manually). The lead
 * only becomes "contacted" once every available channel is done.
 */
export async function markContactedAction(
  businessId: string,
): Promise<ContactActionResult> {
  try {
    await sql`
      update messages set status = 'sent', sent_at = now()
      where business_id = ${businessId}
        and channel = 'whatsapp' and direction = 'outbound'
        and status = 'queued'
    `;
    await refreshContactStatus(businessId);
    await sql`
      insert into events (business_id, stage, level, message)
      values (${businessId}, 'sender', 'info', 'WhatsApp sent (manual)')
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

/** Undo the WhatsApp-sent mark (misclick). */
export async function unmarkContactedAction(
  businessId: string,
): Promise<ContactActionResult> {
  try {
    await sql`
      update messages set status = 'queued', sent_at = null
      where business_id = ${businessId}
        and channel = 'whatsapp' and direction = 'outbound' and status = 'sent'
    `;
    await sql`
      update businesses set status = 'drafted'
      where id = ${businessId} and status = 'contacted'
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

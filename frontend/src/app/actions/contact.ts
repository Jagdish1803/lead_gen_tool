"use server";

import { apiPost } from "@/lib/api";

export type ContactActionResult = { ok: true } | { ok: false; error: string };

async function post(businessId: string, body: unknown): Promise<ContactActionResult> {
  try {
    return await apiPost<ContactActionResult>(
      `/api/leads/${businessId}/contact`,
      body,
    );
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Mark the WhatsApp message as sent (after you send it manually). */
export async function markContactedAction(
  businessId: string,
): Promise<ContactActionResult> {
  return post(businessId, {});
}

/** Undo the WhatsApp-sent mark (misclick). */
export async function unmarkContactedAction(
  businessId: string,
): Promise<ContactActionResult> {
  return post(businessId, { undo: true });
}

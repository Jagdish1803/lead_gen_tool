"use server";

import { apiPost } from "@/lib/api";
import type { BusinessStatus } from "@/lib/types";

export type LeadActionResult = { ok: true } | { ok: false; error: string };

async function post(path: string, body: unknown): Promise<LeadActionResult> {
  try {
    return await apiPost<LeadActionResult>(path, body);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Edit a drafted message body before sending. */
export async function updateMessageAction(
  messageId: string,
  body: string,
): Promise<LeadActionResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Message can't be empty." };
  return post(`/api/leads/${messageId}/message`, { messageId, body: text });
}

/** Save freeform notes on a lead. */
export async function updateNotesAction(
  businessId: string,
  notes: string,
): Promise<LeadActionResult> {
  return post(`/api/leads/${businessId}/notes`, { notes });
}

/** Manually move a lead to a different pipeline stage. */
export async function updateStatusAction(
  businessId: string,
  status: BusinessStatus,
): Promise<LeadActionResult> {
  return post(`/api/leads/${businessId}/status`, { status });
}

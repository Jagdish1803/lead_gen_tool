"use server";

import { revalidatePath } from "next/cache";
import { runEmailFinder } from "@/lib/email-finder";
import { runEmailWriter } from "@/lib/email-writer";
import { runEmailSender } from "@/lib/email-sender";

export type BatchResult =
  | { ok: true; done: number; remaining: number; note?: string }
  | { ok: false; error: string };

function fail(err: unknown): BatchResult {
  return { ok: false, error: err instanceof Error ? err.message : String(err) };
}

export async function findEmailsAction(limit = 8): Promise<BatchResult> {
  try {
    const r = await runEmailFinder({ limit });
    revalidatePath("/");
    revalidatePath("/leads");
    return {
      ok: true,
      done: r.processed,
      remaining: r.remaining,
      note: `${r.found} found`,
    };
  } catch (err) {
    return fail(err);
  }
}

export async function writeEmailsAction(limit = 6): Promise<BatchResult> {
  try {
    const r = await runEmailWriter({ limit });
    revalidatePath("/leads");
    return { ok: true, done: r.written, remaining: r.remaining };
  } catch (err) {
    return fail(err);
  }
}

export async function sendEmailsAction(limit = 10): Promise<BatchResult> {
  try {
    const r = await runEmailSender({ limit });
    revalidatePath("/");
    revalidatePath("/leads");
    return {
      ok: true,
      done: r.sent,
      remaining: r.remaining,
      note: r.failed ? `${r.failed} failed` : undefined,
    };
  } catch (err) {
    return fail(err);
  }
}

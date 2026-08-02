"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; error: string };

/** Turn the master WhatsApp send switch on/off. */
export async function toggleSendingAction(
  enabled: boolean,
): Promise<SettingsActionResult> {
  try {
    await sql`
      update app_settings
      set sending_enabled = ${enabled}, updated_at = now()
      where id = 1
    `;
    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Update the pacing controls (delays in seconds, daily cap). */
export async function updatePacingAction(input: {
  minDelaySec: number;
  maxDelaySec: number;
  dailyCap: number;
}): Promise<SettingsActionResult> {
  const min = Math.max(30, Math.round(input.minDelaySec));
  const max = Math.max(min, Math.round(input.maxDelaySec));
  const cap = Math.max(1, Math.round(input.dailyCap));

  try {
    await sql`
      update app_settings
      set min_delay_sec = ${min}, max_delay_sec = ${max},
          daily_cap = ${cap}, updated_at = now()
      where id = 1
    `;
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

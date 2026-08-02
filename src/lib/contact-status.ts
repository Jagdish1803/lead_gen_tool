import "server-only";
import { sql } from "@/lib/db";
import { likelyHasWhatsApp } from "@/lib/phone";

/**
 * A lead counts as "contacted" only when EVERY channel available for it has
 * been used: if it has an email, the email must be sent; if it has a phone,
 * the WhatsApp must be sent. (At least one channel must have gone out.)
 *
 * Call after any send (email or WhatsApp). Only promotes a lead forward — it
 * won't pull back a replied/interested/client lead.
 */
export async function refreshContactStatus(businessId: string): Promise<void> {
  const [b] = await sql<
    { email: string | null; phone: string | null }[]
  >`select email, phone from businesses where id = ${businessId}`;
  if (!b) return;

  const hasEmail = Boolean(b.email && b.email !== "");
  // Only count WhatsApp as a required channel if the number can actually use it.
  const hasWhatsApp = likelyHasWhatsApp(b.phone);

  const [flags] = await sql<{ email_done: boolean; wa_done: boolean }[]>`
    select
      exists (select 1 from messages m where m.business_id = ${businessId}
        and m.channel = 'email' and m.status = 'sent') as email_done,
      exists (select 1 from messages m where m.business_id = ${businessId}
        and m.channel = 'whatsapp' and m.status = 'sent') as wa_done
  `;

  const allChannelsDone =
    (hasEmail ? flags.email_done : true) &&
    (hasWhatsApp ? flags.wa_done : true) &&
    (flags.email_done || flags.wa_done);

  if (allChannelsDone) {
    await sql`
      update businesses set status = 'contacted'
      where id = ${businessId}
        and status in ('found','audited','drafted','queued')
    `;
  }
}

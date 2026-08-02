import "server-only";
import nodemailer from "nodemailer";
import { sql } from "@/lib/db";
import { VALID_EMAIL } from "@/lib/email-finder";
import { refreshContactStatus } from "@/lib/contact-status";

/**
 * Email sender via SMTP (nodemailer). Automated — email has no ban risk.
 * Configure with SMTP_* env vars (e.g. a Gmail app password, or Brevo).
 */

/** Build the From header from SMTP_FROM_EMAIL/NAME, or the single EMAIL_FROM. */
export function fromAddress(): string | undefined {
  if (process.env.SMTP_FROM_EMAIL) {
    return process.env.SMTP_FROM_NAME
      ? `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`
      : process.env.SMTP_FROM_EMAIL;
  }
  return process.env.EMAIL_FROM;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      fromAddress(),
  );
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export interface EmailSendResult {
  sent: number;
  failed: number;
  remaining: number;
}

/** Send up to `limit` queued emails. Sequential to be gentle on the mailbox. */
export async function runEmailSender({
  limit = 10,
}: { limit?: number } = {}): Promise<EmailSendResult> {
  if (!isEmailConfigured()) {
    throw new Error(
      "Email not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM in .env.local",
    );
  }

  const pending = await sql<
    { id: string; business_id: string; subject: string | null; body: string; email: string; name: string }[]
  >`
    select m.id, m.business_id, m.subject, m.body, b.email, b.name
    from messages m
    join businesses b on b.id = m.business_id
    where m.channel = 'email' and m.direction = 'outbound' and m.status = 'queued'
      and b.email is not null and b.email <> ''
    order by m.created_at
    limit ${limit}
  `;

  const tx = transporter();
  const from = fromAddress()!;
  let sent = 0;
  let failed = 0;

  for (const msg of pending) {
    // Never send to a malformed address (avoids relay/NXDOMAIN bounces).
    if (!VALID_EMAIL.test(msg.email)) {
      await sql`update messages set status = 'failed', error = 'invalid email address' where id = ${msg.id}`;
      await sql`insert into events (business_id, stage, level, message) values (${msg.business_id}, 'email', 'warn', ${"Skipped invalid email: " + msg.email})`;
      failed++;
      continue;
    }
    try {
      await tx.sendMail({
        from,
        to: msg.email,
        replyTo: process.env.REPLY_TO || undefined,
        subject: msg.subject || "Quick question about your website",
        text: msg.body,
      });
      await sql`update messages set status = 'sent', sent_at = now() where id = ${msg.id}`;
      // Only becomes 'contacted' once every available channel is done.
      await refreshContactStatus(msg.business_id);
      await sql`insert into events (business_id, stage, level, message) values (${msg.business_id}, 'email', 'info', ${"Emailed " + msg.name})`;
      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await sql`update messages set status = 'failed', error = ${message} where id = ${msg.id}`;
      await sql`insert into events (business_id, stage, level, message) values (${msg.business_id}, 'email', 'error', ${message})`;
      failed++;
    }
    // Pace sends so the provider doesn't flag "unusual sending activity".
    await new Promise((r) => setTimeout(r, 3500));
  }

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from messages m
    join businesses b on b.id = m.business_id
    where m.channel = 'email' and m.direction = 'outbound' and m.status = 'queued'
      and b.email is not null and b.email <> ''
  `;

  return { sent, failed, remaining: n };
}

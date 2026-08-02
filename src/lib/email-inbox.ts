import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { sql } from "@/lib/db";

/**
 * Reads recent inbox messages over IMAP (replies from businesses).
 * Reuses SMTP_USER + SMTP_PASS to log in. Needs IMAP enabled on the account.
 */

export function isInboxConfigured(): boolean {
  return Boolean(
    process.env.IMAP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

export interface InboxMessage {
  from: string;
  fromName: string;
  subject: string;
  date: string | null;
  snippet: string;
  leadId: string | null;
  leadName: string | null;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("IMAP timed out")), ms),
    ),
  ]);
}

export async function fetchInbox(limit = 15): Promise<InboxMessage[]> {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST!,
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    logger: false,
  });

  const run = async (): Promise<InboxMessage[]> => {
    await client.connect();
    const out: InboxMessage[] = [];
    const lock = await client.getMailboxLock("INBOX");
    try {
      const mb = client.mailbox;
      const total = mb ? mb.exists : 0;
      if (total > 0) {
        const start = Math.max(1, total - limit + 1);
        for await (const msg of client.fetch(`${start}:*`, {
          envelope: true,
          source: true,
        })) {
          const from = msg.envelope?.from?.[0];
          let snippet = "";
          try {
            const parsed = await simpleParser(msg.source as Buffer);
            snippet = (parsed.text || "").replace(/\s+/g, " ").trim().slice(0, 160);
          } catch {
            /* ignore parse errors */
          }
          out.push({
            from: from?.address ?? "",
            fromName: from?.name ?? "",
            subject: msg.envelope?.subject ?? "(no subject)",
            date: msg.envelope?.date
              ? new Date(msg.envelope.date).toISOString()
              : null,
            snippet,
            leadId: null,
            leadName: null,
          });
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return out.reverse();
  };

  let messages: InboxMessage[];
  try {
    messages = await withTimeout(run(), 20_000);
  } catch (err) {
    try {
      await client.close();
    } catch {
      /* ignore */
    }
    throw err;
  }

  // Match sender addresses to known leads.
  const addrs = messages.map((m) => m.from).filter(Boolean);
  if (addrs.length > 0) {
    const leads = await sql<{ id: string; name: string; email: string }[]>`
      select id, name, email from businesses where email = any(${addrs})
    `;
    const byEmail = new Map(leads.map((l) => [l.email.toLowerCase(), l]));
    for (const m of messages) {
      const lead = byEmail.get(m.from.toLowerCase());
      if (lead) {
        m.leadId = lead.id;
        m.leadName = lead.name;
      }
    }
  }

  return messages;
}

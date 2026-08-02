// Verify IMAP access to the inbox.
//   npm run inbox:test
import { ImapFlow } from "imapflow";

const { IMAP_HOST, IMAP_PORT, SMTP_USER, SMTP_PASS } = process.env;
if (!IMAP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error("Missing IMAP_HOST / SMTP_USER / SMTP_PASS in .env.local");
  process.exit(1);
}

const client = new ImapFlow({
  host: IMAP_HOST,
  port: Number(IMAP_PORT || 993),
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  logger: false,
});

try {
  console.log(`Connecting to ${IMAP_HOST} as ${SMTP_USER} …`);
  await client.connect();
  console.log("✓ IMAP login OK.");
  const lock = await client.getMailboxLock("INBOX");
  try {
    const total = client.mailbox.exists;
    console.log(`Inbox has ${total} messages. Latest few:`);
    const start = Math.max(1, total - 4);
    for await (const msg of client.fetch(`${start}:*`, { envelope: true })) {
      const from = msg.envelope?.from?.[0];
      console.log(
        `  • ${(from?.name || from?.address || "?").slice(0, 30).padEnd(30)} | ${msg.envelope?.subject ?? "(no subject)"}`,
      );
    }
  } finally {
    lock.release();
  }
  await client.logout();
} catch (err) {
  console.error("✗ IMAP failed:", err.message);
  console.error(
    "  If it's an auth error: enable IMAP access in Zoho Mail → Settings → Mail Accounts → IMAP.",
  );
  process.exitCode = 1;
}

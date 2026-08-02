// Verify SMTP credentials by sending a test email to yourself.
//   npm run email:test -- you@example.com
// (defaults to SMTP_USER if no address is given)
import nodemailer from "nodemailer";

const to = process.argv[2] || process.env.SMTP_USER;
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
  console.error(
    "Missing SMTP settings. Fill SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM in .env.local.",
  );
  process.exit(1);
}

const tx = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 465),
  secure: Number(SMTP_PORT || 465) === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

try {
  console.log("Verifying SMTP connection…");
  await tx.verify();
  console.log("✓ SMTP login OK. Sending test email to", to, "…");
  const info = await tx.sendMail({
    from: EMAIL_FROM,
    to,
    subject: "Pitching Tool — test email ✅",
    text: "If you're reading this, your email sending is set up correctly.",
  });
  console.log("✓ Sent. Message id:", info.messageId);
  console.log("Check the inbox (and spam folder) for", to);
} catch (err) {
  console.error("✗ Failed:", err.message);
  process.exitCode = 1;
}

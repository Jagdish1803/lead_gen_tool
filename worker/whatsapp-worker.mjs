// WhatsApp worker (Baileys) + slow-pacing send engine.
//
//   node --env-file=.env.local worker/whatsapp-worker.mjs
//
// - Maintains a persistent WhatsApp connection (auth in ./baileys_auth).
// - Shows a QR to scan on first run (terminal + dashboard).
// - Sends QUEUED outbound messages at a human pace: one every 3-5 min
//   (randomized), capped per day, and ONLY when sending is enabled.
// - Writes its live status to whatsapp_state for the dashboard.
//
// Safety: sending_enabled defaults OFF. Nothing goes out until you turn it on.

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcodeTerminal from "qrcode-terminal";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: "require",
  max: 2,
});
const logger = pino({ level: "silent" });

let sock = null;
let connected = false;
let nextAllowedSendAt = 0; // epoch ms gate for pacing

// ---------- state helpers ------------------------------------

async function setState(patch) {
  const entries = Object.entries(patch);
  if (entries.length === 0) return;
  // Build a dynamic UPDATE ... SET col = val, ...
  const assignments = entries.map(([k]) => k);
  const values = Object.fromEntries(entries);
  await sql`
    update whatsapp_state
    set ${sql(values, ...assignments)}, updated_at = now()
    where id = 1
  `;
}

async function getSettings() {
  const [s] = await sql`select * from app_settings where id = 1`;
  return s;
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

// digits-only, ensure Indian country code
function toWaNumber(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10) d = "91" + d;
  else if (d.startsWith("0")) d = "91" + d.slice(1);
  return d;
}

// ---------- pacing engine ------------------------------------

async function resetDailyCapIfNeeded() {
  const today = new Date().toISOString().slice(0, 10);
  const [w] = await sql`select sent_today_date from whatsapp_state where id = 1`;
  const stored = w?.sent_today_date
    ? new Date(w.sent_today_date).toISOString().slice(0, 10)
    : null;
  if (stored !== today) {
    await sql`update whatsapp_state set sent_today = 0, sent_today_date = ${today} where id = 1`;
  }
}

async function tick() {
  try {
    if (!connected || !sock) return;

    const settings = await getSettings();
    if (!settings?.sending_enabled) return;

    await resetDailyCapIfNeeded();

    const [state] = await sql`select sent_today from whatsapp_state where id = 1`;
    if (state.sent_today >= settings.daily_cap) return;

    if (Date.now() < nextAllowedSendAt) return;

    // Grab the oldest queued outbound message that has a phone number.
    const [msg] = await sql`
      select m.id, m.body, b.id as business_id, b.name, b.phone
      from messages m
      join businesses b on b.id = m.business_id
      where m.direction = 'outbound' and m.status = 'queued' and b.phone is not null
      order by m.created_at
      limit 1
    `;
    if (!msg) return;

    const number = toWaNumber(msg.phone);
    if (!number) {
      await sql`update messages set status = 'failed', error = 'no valid phone' where id = ${msg.id}`;
      return;
    }

    // Verify the number is actually on WhatsApp.
    let jid;
    try {
      const [res] = await sock.onWhatsApp(number);
      if (!res?.exists) {
        await sql`update messages set status = 'failed', error = 'not on WhatsApp' where id = ${msg.id}`;
        await sql`insert into events (business_id, stage, level, message) values (${msg.business_id}, 'sender', 'warn', 'Number not on WhatsApp')`;
        return;
      }
      jid = res.jid;
    } catch (e) {
      await sql`update messages set status = 'failed', error = ${"onWhatsApp check failed: " + e.message} where id = ${msg.id}`;
      return;
    }

    // Send it.
    await sock.sendMessage(jid, { text: msg.body });

    await sql`update messages set status = 'sent', sent_at = now() where id = ${msg.id}`;
    await sql`update businesses set status = 'contacted' where id = ${msg.business_id}`;
    await sql`update whatsapp_state set sent_today = sent_today + 1 where id = 1`;
    await sql`insert into events (business_id, stage, level, message) values (${msg.business_id}, 'sender', 'info', ${"Sent WhatsApp to " + msg.name})`;

    // Schedule the next send after a randomized human-like gap.
    const gapSec = randomBetween(settings.min_delay_sec, settings.max_delay_sec);
    nextAllowedSendAt = Date.now() + gapSec * 1000;
    console.log(`✓ Sent to ${msg.name}. Next send in ~${Math.round(gapSec / 60)} min.`);
  } catch (err) {
    console.error("tick error:", err.message);
    await setState({ last_error: err.message }).catch(() => {});
  }
}

// ---------- connection ---------------------------------------

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: Browsers.appropriate("Chrome"),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connected = false;
      console.log("\nScan this QR with WhatsApp (Linked Devices):\n");
      qrcodeTerminal.generate(qr, { small: true });
      await setState({ status: "qr", qr, last_error: null }).catch(() => {});
    }

    if (connection === "connecting") {
      await setState({ status: "connecting" }).catch(() => {});
    }

    if (connection === "open") {
      connected = true;
      const phone = sock.user?.id?.split(":")[0] ?? null;
      console.log(`\n✓ WhatsApp connected as ${phone}`);
      await setState({ status: "connected", qr: null, phone, last_error: null }).catch(() => {});
    }

    if (connection === "close") {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      await setState({
        status: loggedOut ? "disconnected" : "connecting",
        last_error: lastDisconnect?.error?.message ?? null,
      }).catch(() => {});

      if (loggedOut) {
        console.log("Logged out. Delete ./baileys_auth and restart to re-link.");
      } else {
        console.log("Connection closed, reconnecting…");
        setTimeout(start, 3000);
      }
    }
  });
}

// ---------- boot ---------------------------------------------

console.log("Starting WhatsApp worker…");
await setState({ status: "connecting", last_error: null }).catch(() => {});
await start();

// Pacing loop: check every 20s; the nextAllowedSendAt gate enforces spacing.
setInterval(tick, 20_000);

// Keep the process alive.
process.on("SIGINT", async () => {
  console.log("\nShutting down…");
  await setState({ status: "disconnected" }).catch(() => {});
  await sql.end().catch(() => {});
  process.exit(0);
});

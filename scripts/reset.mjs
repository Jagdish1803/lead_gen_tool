// Reset pipeline data for local testing.
//   npm run reset            → full wipe (start from a fresh search)
//   npm run reset:pipeline   → keep businesses, clear audits/messages,
//                              reset status to 'found' (re-audit + re-write
//                              without spending SerpApi credits)
import postgres from "postgres";

const pipelineOnly = process.argv.includes("--pipeline");
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: "require",
  max: 1,
});

try {
  await sql`delete from events`;
  await sql`delete from messages`;
  await sql`delete from audits`;

  if (pipelineOnly) {
    await sql`update businesses set status = 'found', notes = null`;
    const [{ n }] = await sql`select count(*)::int n from businesses`;
    console.log(`Reset ${n} businesses to 'found'. Audits + messages cleared.`);
  } else {
    await sql`delete from businesses`;
    await sql`delete from searches`;
    console.log("Full wipe: businesses, searches, audits, messages cleared.");
  }

  await sql`
    update whatsapp_state
    set sent_today = 0, sent_today_date = null
    where id = 1
  `;
  await sql`update app_settings set sending_enabled = false where id = 1`;
  console.log("Sending switched OFF; daily counter reset.");
} finally {
  await sql.end();
}

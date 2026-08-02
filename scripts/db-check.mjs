// Verifies the RUNTIME pooler connection (DATABASE_URL) works with the same
// settings the app uses (prepare:false for pgbouncer).
// Run with:  node --env-file=.env.local scripts/db-check.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: "require",
  max: 1,
});

try {
  const [{ n }] = await sql`select count(*)::int as n from businesses`;
  console.log(`✓ Pooler connection OK. businesses rows: ${n}`);
} catch (err) {
  console.error("✗ Pooler connection failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}

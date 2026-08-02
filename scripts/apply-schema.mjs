// Applies supabase/schema.sql to the database over the DIRECT_URL.
// Run with:  node --env-file=.env.local scripts/apply-schema.mjs
import postgres from "postgres";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "supabase", "schema.sql");

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("Missing DIRECT_URL (load .env.local with --env-file)");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });

try {
  const schema = await readFile(schemaPath, "utf8");
  console.log("Applying schema.sql …");
  await sql.unsafe(schema);
  console.log("✓ Schema applied.");

  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `;
  console.log(
    "Public tables:",
    tables.map((t) => t.table_name).join(", ") || "(none)",
  );
} catch (err) {
  console.error("✗ Failed to apply schema:");
  console.error(err);
  process.exitCode = 1;
} finally {
  await sql.end();
}

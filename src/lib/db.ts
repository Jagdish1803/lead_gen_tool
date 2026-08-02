import "server-only";
import postgres from "postgres";

/**
 * Server-side Postgres client (postgres.js) for Supabase.
 *
 * Uses the transaction-mode pooler (DATABASE_URL, pgbouncer). Prepared
 * statements are disabled because pgbouncer's transaction pooling doesn't
 * support them. A single client is reused across HMR reloads in dev.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL");
}

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForDb.sql ??
  postgres(connectionString, {
    prepare: false, // required for the transaction (pgbouncer) pooler
    ssl: "require",
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}

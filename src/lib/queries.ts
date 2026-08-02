import "server-only";
import { sql } from "@/lib/db";
import type { Business, BusinessStatus, Search } from "@/lib/types";

/** Count of businesses in each pipeline stage. */
export async function getStageCounts(): Promise<Record<BusinessStatus, number>> {
  const rows = await sql<{ status: BusinessStatus; count: string }[]>`
    select status, count(*)::int as count
    from businesses
    group by status
  `;
  const counts = {} as Record<BusinessStatus, number>;
  for (const row of rows) counts[row.status] = Number(row.count);
  return counts;
}

/** Most recent leads for the dashboard table. */
export async function getRecentLeads(limit = 10): Promise<Business[]> {
  return sql<Business[]>`
    select *
    from businesses
    order by created_at desc
    limit ${limit}
  `;
}

/** All leads, newest first. */
export async function getAllLeads(limit = 200): Promise<Business[]> {
  return sql<Business[]>`
    select *
    from businesses
    order by created_at desc
    limit ${limit}
  `;
}

/** Search history, newest first. */
export async function getSearches(limit = 100): Promise<Search[]> {
  return sql<Search[]>`
    select *
    from searches
    order by created_at desc
    limit ${limit}
  `;
}

import "server-only";
import { sql } from "@/lib/db";
import { searchGoogleMapsPage, type SerpLocalResult } from "@/lib/serpapi";

// Pull up to ~60 results (3 pages × 20). Each page = 1 SerpApi search (billable).
const PAGE_SIZE = 20;
const MAX_PAGES = 3;
const MAX_RESULTS = MAX_PAGES * PAGE_SIZE;

export interface FinderResult {
  searchId: string;
  fetched: number; // total results returned by SerpApi
  inserted: number; // new businesses actually saved (after dedupe)
  pages: number; // pages fetched (= SerpApi searches used)
}

function mapsUrl(placeId?: string): string | null {
  return placeId
    ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
    : null;
}

function toRow(r: SerpLocalResult, searchId: string) {
  return {
    search_id: searchId,
    place_id: r.place_id ?? null,
    name: r.title,
    phone: r.phone ?? null,
    website: r.website ?? null,
    address: r.address ?? null,
    maps_url: mapsUrl(r.place_id),
    category: r.type ?? r.types?.[0] ?? null,
    rating: r.rating ?? null,
    reviews_count: r.reviews ?? null,
  };
}

/**
 * Runs a search: fetches businesses from Google Maps (via SerpApi),
 * dedupes them, and saves new ones to the database.
 */
export async function runFinder({
  businessType,
  location,
}: {
  businessType: string;
  location: string;
}): Promise<FinderResult> {
  const query = `${businessType} in ${location}`;

  const [search] = await sql<{ id: string }[]>`
    insert into searches (business_type, location, status)
    values (${businessType}, ${location}, 'running')
    returning id
  `;
  const searchId = search.id;

  try {
    const all: SerpLocalResult[] = [];
    let pages = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const { results, hasNext } = await searchGoogleMapsPage(
        query,
        page * PAGE_SIZE,
      );
      pages++;
      all.push(...results);
      if (!hasNext || results.length === 0 || all.length >= MAX_RESULTS) break;
    }

    // Dedupe within this batch by place_id (cross-run dedupe is handled by the
    // unique constraint + ON CONFLICT below).
    const seen = new Set<string>();
    const rows = [];
    for (const r of all) {
      if (r.place_id) {
        if (seen.has(r.place_id)) continue;
        seen.add(r.place_id);
      }
      rows.push(toRow(r, searchId));
    }

    let inserted = 0;
    if (rows.length > 0) {
      const insertedRows = await sql`
        insert into businesses ${sql(
          rows,
          "search_id",
          "place_id",
          "name",
          "phone",
          "website",
          "address",
          "maps_url",
          "category",
          "rating",
          "reviews_count",
        )}
        on conflict (place_id) do nothing
        returning id
      `;
      inserted = insertedRows.length;
    }

    await sql`
      update searches
      set status = 'done', results_count = ${inserted}
      where id = ${searchId}
    `;

    await sql`
      insert into events (business_id, stage, level, message, meta)
      values (
        null, 'finder', 'info',
        ${`Found ${all.length} results, saved ${inserted} new`},
        ${sql.json({ query, fetched: all.length, inserted, pages })}
      )
    `;

    return { searchId, fetched: all.length, inserted, pages };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sql`
      update searches set status = 'failed', error = ${message}
      where id = ${searchId}
    `;
    throw err;
  }
}

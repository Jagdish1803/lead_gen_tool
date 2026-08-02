import "server-only";

/**
 * Minimal SerpApi client for the Google Maps engine.
 * Docs: https://serpapi.com/google-maps-api
 *
 * Note on cost: each page fetched counts as one SerpApi search.
 */

export interface SerpLocalResult {
  position?: number;
  title: string;
  place_id?: string;
  data_id?: string;
  gps_coordinates?: { latitude: number; longitude: number };
  rating?: number;
  reviews?: number;
  type?: string;
  types?: string[];
  address?: string;
  phone?: string;
  website?: string;
}

interface SerpMapsResponse {
  error?: string;
  local_results?: SerpLocalResult[];
  place_results?: SerpLocalResult;
  serpapi_pagination?: { next?: string };
}

const ENDPOINT = "https://serpapi.com/search.json";

/**
 * Fetch one page of Google Maps local results.
 * @param query   e.g. "Dental Clinic in Mumbai"
 * @param start   result offset (0, 20, 40, …)
 */
export async function searchGoogleMapsPage(
  query: string,
  start = 0,
): Promise<{ results: SerpLocalResult[]; hasNext: boolean }> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error("Missing SERPAPI_KEY");

  const params = new URLSearchParams({
    engine: "google_maps",
    type: "search",
    q: query,
    hl: "en",
    start: String(start),
    api_key: apiKey,
  });

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    // Never cache — this is billable, on-demand data.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`SerpApi HTTP ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as SerpMapsResponse;
  if (data.error) throw new Error(`SerpApi: ${data.error}`);

  const results = data.local_results ?? [];
  const hasNext = Boolean(data.serpapi_pagination?.next);
  return { results, hasNext };
}

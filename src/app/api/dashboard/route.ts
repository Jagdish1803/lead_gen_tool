import { NextResponse } from "next/server";
import {
  getStageCounts,
  getBestNextActions,
  getOutreachStats,
  getOutreachDaily,
  getSearches,
  getEmailCounts,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const [counts, actions, stats, daily, searches, email] = await Promise.all([
    getStageCounts(),
    getBestNextActions(5),
    getOutreachStats(),
    getOutreachDaily(14),
    getSearches(6),
    getEmailCounts(),
  ]);
  return NextResponse.json({ counts, actions, stats, daily, searches, email });
}

import { NextResponse } from "next/server";
import { getSearches } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 1000) || 1000;
  const searches = await getSearches(limit);
  return NextResponse.json({ searches });
}

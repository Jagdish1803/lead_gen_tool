import { NextResponse } from "next/server";
import { getLeadsWithAudits, type LeadSort, type LeadFilter } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sort = (searchParams.get("sort") ?? "newest") as LeadSort;
  const filter = (searchParams.get("filter") ?? "all") as LeadFilter;
  const limit = Number(searchParams.get("limit") ?? 500) || 500;
  const leads = await getLeadsWithAudits({ sort, filter, limit });
  return NextResponse.json({ leads });
}

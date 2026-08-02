import { NextResponse } from "next/server";
import { getPipelineProgress } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getPipelineProgress());
}

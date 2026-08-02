import { NextResponse } from "next/server";
import { startPipeline, getPipelineProgress } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function POST() {
  startPipeline();
  return NextResponse.json({ ok: true, progress: getPipelineProgress() });
}

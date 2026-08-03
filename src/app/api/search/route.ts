import { NextResponse } from "next/server";
import { runFinder } from "@/lib/finder";
import { startPipeline } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { businessType, location } = await req.json().catch(() => ({}));
  const type = typeof businessType === "string" ? businessType.trim() : "";
  const loc = typeof location === "string" ? location.trim() : "";
  if (!type || !loc) {
    return NextResponse.json(
      { ok: false, error: "Enter both a business type and a location." },
      { status: 400 },
    );
  }
  try {
    const data = await runFinder({ businessType: type, location: loc });
    // Kick off the whole pipeline in the background (audit → write → email…).
    startPipeline();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

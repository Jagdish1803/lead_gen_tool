import { NextResponse } from "next/server";
import { updateStatusAction } from "@/app/actions/lead";
import type { BusinessStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { status } = await req.json().catch(() => ({}));
  if (!status) {
    return NextResponse.json({ ok: false, error: "Missing status." }, { status: 400 });
  }
  const res = await updateStatusAction(id, status as BusinessStatus);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

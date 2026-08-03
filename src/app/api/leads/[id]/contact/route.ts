import { NextResponse } from "next/server";
import { markContactedAction, unmarkContactedAction } from "@/app/actions/contact";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { undo } = await req.json().catch(() => ({}));
  const res = undo
    ? await unmarkContactedAction(id)
    : await markContactedAction(id);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

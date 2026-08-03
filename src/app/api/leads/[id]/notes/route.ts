import { NextResponse } from "next/server";
import { updateNotesAction } from "@/app/actions/lead";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { notes } = await req.json().catch(() => ({}));
  const res = await updateNotesAction(id, typeof notes === "string" ? notes : "");
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

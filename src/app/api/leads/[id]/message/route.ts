import { NextResponse } from "next/server";
import { updateMessageAction } from "@/app/actions/lead";

export const dynamic = "force-dynamic";

// Edit a drafted message body. Pass { messageId, body }.
export async function POST(
  req: Request,
  _ctx: { params: Promise<{ id: string }> },
) {
  const { messageId, body } = await req.json().catch(() => ({}));
  if (!messageId) {
    return NextResponse.json({ ok: false, error: "Missing messageId." }, { status: 400 });
  }
  const res = await updateMessageAction(messageId, typeof body === "string" ? body : "");
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

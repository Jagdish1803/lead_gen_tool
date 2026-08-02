import { NextResponse } from "next/server";
import { fetchInbox, isInboxConfigured } from "@/lib/email-inbox";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isInboxConfigured()) {
    return NextResponse.json(
      { ok: false, error: "IMAP not configured in .env.local" },
      { status: 400 },
    );
  }
  try {
    const messages = await fetchInbox(15);
    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getSidebarCounts } from "@/lib/queries";
import { isEmailConfigured } from "@/lib/email-sender";

export const dynamic = "force-dynamic";

export async function GET() {
  const counts = await getSidebarCounts();
  return NextResponse.json({ counts, emailReady: isEmailConfigured() });
}

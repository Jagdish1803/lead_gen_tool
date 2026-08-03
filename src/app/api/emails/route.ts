import { NextResponse } from "next/server";
import { getSentEmails } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const emails = await getSentEmails();
  return NextResponse.json({ emails });
}

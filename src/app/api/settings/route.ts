import { NextResponse } from "next/server";
import { getEmailCounts } from "@/lib/queries";
import { activeProvider } from "@/lib/ai";
import { isEmailConfigured, fromAddress } from "@/lib/email-sender";

export const dynamic = "force-dynamic";

// Connection/config status for the Settings page (all secrets live here on
// the backend — the frontend only ever sees these booleans).
export async function GET() {
  const [email] = await Promise.all([getEmailCounts()]);
  const provider = activeProvider();
  return NextResponse.json({
    email,
    provider,
    connections: {
      serpapi: Boolean(process.env.SERPAPI_KEY),
      pagespeed: Boolean(process.env.PAGESPEED_API_KEY),
      ai: provider !== "none",
      email: isEmailConfigured(),
      emailFrom: fromAddress() ?? null,
    },
  });
}

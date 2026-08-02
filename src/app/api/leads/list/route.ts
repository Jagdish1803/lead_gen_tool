import { NextResponse } from "next/server";
import { getAllLeads } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Lightweight lead list for the ⌘K command palette.
export async function GET() {
  try {
    const leads = await getAllLeads(500);
    return NextResponse.json({
      ok: true,
      leads: leads.map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        address: l.address,
        status: l.status,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

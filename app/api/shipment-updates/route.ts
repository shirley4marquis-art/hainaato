import { NextResponse } from "next/server";
import { getShipmentUpdates } from "../../../lib/crm";

// Anonymized only: ref + destination country + status + timestamp. No name,
// phone, email, or financial figure is ever selected by getShipmentUpdates,
// and only rows the customer explicitly opted into at submission time are
// returned in the first place.
//
// This is polled every 30s by every visitor on every page (see
// app/shipment-ticker.tsx) with no per-visitor variation, so without HTTP
// caching the Postgres query load scales with concurrent visitors for data
// that only actually changes when staff update a quote's status. s-maxage
// lets Vercel's edge serve every visitor's poll from one shared cached
// response instead of hitting the DB per request; stale-while-revalidate
// keeps that response available (slightly stale) while a fresh one is
// fetched in the background rather than blocking a request on it.
export async function GET() {
  try {
    const updates = await getShipmentUpdates(20);
    return NextResponse.json(
      { ok: true, updates },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    console.error("[shipment-updates] CRM query failed:", error);
    return NextResponse.json({ ok: false, updates: [] }, { status: 200 });
  }
}

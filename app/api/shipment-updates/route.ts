import { NextResponse } from "next/server";
import { getShipmentUpdates } from "../../../lib/crm";

// Anonymized only: ref + destination country + status + timestamp. No name,
// phone, email, or financial figure is ever selected by getShipmentUpdates,
// and only rows the customer explicitly opted into at submission time are
// returned in the first place.
export async function GET() {
  try {
    const updates = await getShipmentUpdates(20);
    return NextResponse.json({ ok: true, updates });
  } catch (error) {
    console.error("[shipment-updates] CRM query failed:", error);
    return NextResponse.json({ ok: false, updates: [] }, { status: 200 });
  }
}

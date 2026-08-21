import { NextResponse } from "next/server";
import { getBrandAggregates } from "../../../lib/vehicles";

export async function GET() {
  try {
    const list = getBrandAggregates(100);
    return NextResponse.json({ brands: list });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

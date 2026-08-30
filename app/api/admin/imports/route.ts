import { NextResponse } from "next/server";
import { runMadeInChinaImport } from "../../../../lib/imports/made-in-china";
import { listImportedListings } from "../../../../lib/imports/store";
import type { ListingSearchFilters } from "../../../../lib/imports/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters: ListingSearchFilters = {
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    brand: url.searchParams.get("brand") ?? undefined,
    supplier: url.searchParams.get("supplier") ?? undefined,
    source: (url.searchParams.get("source") as ListingSearchFilters["source"]) ?? undefined,
    status: (url.searchParams.get("status") as ListingSearchFilters["status"]) ?? undefined,
    minPrice: url.searchParams.get("minPrice") ?? undefined,
    maxPrice: url.searchParams.get("maxPrice") ?? undefined,
  };
  try {
    const listings = await listImportedListings(filters);
    return NextResponse.json({ ok: true, listings });
  } catch (error) {
    console.error("[admin/imports] GET failed:", error);
    return NextResponse.json({ ok: false, error: "Could not load imported listings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const log = await runMadeInChinaImport(body ?? {});
    return NextResponse.json({ ok: true, log });
  } catch (error) {
    console.error("[admin/imports] POST failed:", error);
    return NextResponse.json({ ok: false, error: "Import run failed." }, { status: 500 });
  }
}


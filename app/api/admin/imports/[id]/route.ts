import { NextResponse } from "next/server";
import { updateImportedListing } from "../../../../../lib/imports/store";
import type { ImportedListingStatus } from "../../../../../lib/imports/types";

const STATUSES = new Set<ImportedListingStatus>(["pending_review", "verified", "rejected", "needs_update"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.listing_status && !STATUSES.has(body.listing_status)) {
      return NextResponse.json({ ok: false, error: "Invalid listing status." }, { status: 400 });
    }
    const listing = await updateImportedListing(id, body);
    if (!listing) return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
    return NextResponse.json({ ok: true, listing });
  } catch (error) {
    console.error("[admin/imports/:id] PATCH failed:", error);
    return NextResponse.json({ ok: false, error: "Could not update the listing." }, { status: 500 });
  }
}


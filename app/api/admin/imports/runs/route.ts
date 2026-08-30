import { NextResponse } from "next/server";
import { listImportLogs } from "../../../../../lib/imports/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, runs: await listImportLogs() });
  } catch (error) {
    console.error("[admin/imports/runs] GET failed:", error);
    return NextResponse.json({ ok: false, error: "Could not load import runs." }, { status: 500 });
  }
}


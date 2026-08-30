import { NextResponse } from "next/server";
import { getImportConfig, saveImportConfig } from "../../../../../lib/imports/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, config: await getImportConfig() });
  } catch (error) {
    console.error("[admin/imports/config] request failed:", error);
    return NextResponse.json({ ok: false, error: "Could not process the import configuration." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const current = await getImportConfig();
    const body = await request.json();
    const config = await saveImportConfig({ ...current, ...body, source: "made-in-china" });
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    console.error("[admin/imports/config] request failed:", error);
    return NextResponse.json({ ok: false, error: "Could not process the import configuration." }, { status: 500 });
  }
}


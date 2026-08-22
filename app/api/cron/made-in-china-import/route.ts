import { NextResponse } from "next/server";
import { runMadeInChinaImport } from "../../../../lib/imports/made-in-china";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const log = await runMadeInChinaImport();
  return NextResponse.json({ ok: true, log });
}

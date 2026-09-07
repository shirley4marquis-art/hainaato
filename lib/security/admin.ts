import { NextResponse } from "next/server";
import { createClient } from "../supabase/server";
import { isAdminUser } from "../supabase/roles";

// Authorize at the data boundary as well as in proxy.ts.
export async function guardAdminRequest(request: Request): Promise<NextResponse | null> {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
      return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
    }
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !isAdminUser(user)) return NextResponse.json({ ok: false, error: "Staff access required." }, { status: user ? 403 : 401 });
  return null;
}

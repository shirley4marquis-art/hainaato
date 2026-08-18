import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { isAdminUser } from "../../../../lib/supabase/roles";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const email = typeof b?.email === "string" ? b.email.trim() : "";
  const password = typeof b?.password === "string" ? b.password : "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ ok: false, error: "Incorrect email or password." }, { status: 401 });
  }
  if (!isAdminUser(data.user)) {
    await supabase.auth.signOut();
    return NextResponse.json({ ok: false, error: "This account does not have staff access." }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}

// Session refresh + user lookup for proxy.ts (this Next.js version's renamed
// middleware.ts — see node_modules/next/dist/docs/.../proxy.md). Supabase
// session tokens expire and must be refreshed on the request/response cookie
// pair, not just read — doing that here (not in lib/supabase/server.ts, which
// only has access to a Server Component's read-only cookie jar) is what keeps
// staff signed in across a 1-hour token lifetime without re-logging-in.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    }
  );

  // getUser() (not getSession()) — it revalidates the token against Supabase
  // Auth's server rather than trusting whatever the cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

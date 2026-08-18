// Supabase client for Server Components, Server Actions and Route Handlers —
// reads the session from the incoming request's cookies via next/headers.
// Only used for Auth here (sign in/out, getUser); the CRM's actual data
// (quotes/customers) still goes through lib/crm.ts's direct pg connection,
// not through Supabase's PostgREST layer.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll called from a Server Component (no request/response to
            // write cookies to) — safe to ignore as long as proxy.ts is
            // refreshing the session on every request (see lib/supabase/middleware.ts).
          }
        },
      },
    }
  );
}

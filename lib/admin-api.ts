import { createClient } from "./supabase/server";
import { isAdminUser } from "./supabase/roles";
export async function requireAdmin(request?: Request) {
 if (request && !["GET","HEAD"].includes(request.method)) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("Forbidden");
 }
 const { data: { user } } = await (await createClient()).auth.getUser();
 if (!user || !isAdminUser(user)) throw new Error("Unauthorized");
 return user;
}
export function apiError(error: unknown) {
 const message = error instanceof Error ? error.message : "Request failed";
 const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : message.startsWith("Invalid") ? 400 : message.includes("changed by another") ? 409 : 500;
 console.error("[admin]", error);
 return Response.json({ ok:false,error: status === 500 ? "Could not complete this action. Please retry." : message },{status});
}
export const validId = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

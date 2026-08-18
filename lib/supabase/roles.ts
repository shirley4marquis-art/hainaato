import type { User } from "@supabase/supabase-js";

export const ADMIN_ROLES = ["admin", "sales_admin", "operations", "finance"] as const;
type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminUser(user: User | null | undefined): boolean {
  const role = user?.app_metadata?.role;
  return typeof role === "string" && (ADMIN_ROLES as readonly string[]).includes(role as AdminRole);
}

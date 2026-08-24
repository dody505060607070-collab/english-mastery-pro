import type { SupabaseClient } from "@supabase/supabase-js";

const STAFF_ROLES = ["admin", "super_admin", "teacher", "instructor", "editor"];
const ADMIN_ROLES = ["admin", "super_admin"];

export async function getRoles(supabase: SupabaseClient<any>, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: { role: string }) => r.role);
}

export async function assertStaff(supabase: SupabaseClient<any>, userId: string) {
  const roles = await getRoles(supabase, userId);
  if (!roles.some((r) => STAFF_ROLES.includes(r))) throw new Error("Forbidden");
  return roles;
}

export async function assertAdmin(supabase: SupabaseClient<any>, userId: string) {
  const roles = await getRoles(supabase, userId);
  if (!roles.some((r) => ADMIN_ROLES.includes(r))) throw new Error("Forbidden");
  return roles;
}

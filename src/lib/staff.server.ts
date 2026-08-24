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

/* ------------------------------------------------ granular teacher caps */

/** Capabilities an admin can grant to a teacher. Admins always have all of them. */
export const CAPABILITIES = [
  "students",      // view / edit students
  "curriculum",    // levels & units structure
  "content",       // unit contents (lessons, exercises, vocab)
  "courses",
  "recordings",
  "live",
  "vocabulary",
  "notifications",
  "analytics",
  "payments",
  "approvals",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** What a teacher gets when the admin has not customised anything yet. */
export const DEFAULT_TEACHER_CAPS: Capability[] = [
  "students",
  "content",
  "recordings",
  "live",
  "vocabulary",
  "analytics",
];

export function isAdminRoles(roles: string[]) {
  return roles.some((r) => ADMIN_ROLES.includes(r));
}

/** Read the admin-managed capability map from site_content. */
export async function getCapabilityMap(
  supabase: SupabaseClient<any>,
): Promise<Record<string, string[]>> {
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "teacher.permissions")
    .maybeSingle();
  const value = (data?.value ?? {}) as Record<string, string[]>;
  return typeof value === "object" && value ? value : {};
}

/** Effective capabilities for one staff member. */
export async function getCapabilities(supabase: SupabaseClient<any>, userId: string) {
  const roles = await getRoles(supabase, userId);
  if (!roles.some((r) => STAFF_ROLES.includes(r))) throw new Error("Forbidden");
  if (isAdminRoles(roles)) return { roles, isAdmin: true, caps: [...CAPABILITIES] as string[] };
  const map = await getCapabilityMap(supabase);
  const caps = map[userId] ?? DEFAULT_TEACHER_CAPS;
  return { roles, isAdmin: false, caps: caps as string[] };
}

/** Staff gate + capability check in one call. Admins bypass the capability part. */
export async function assertCan(
  supabase: SupabaseClient<any>,
  userId: string,
  cap: Capability,
) {
  const { roles, isAdmin, caps } = await getCapabilities(supabase, userId);
  if (!isAdmin && !caps.includes(cap)) throw new Error("Forbidden: missing permission " + cap);
  return roles;
}

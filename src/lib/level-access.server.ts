/** Shared helper: every level (section) a user is allowed to open. */
export async function getAccessibleSectionIds(supabase: any, userId: string): Promise<string[]> {
  const [{ data: profile }, { data: extra }] = await Promise.all([
    supabase.from("profiles").select("section_id").eq("id", userId).maybeSingle(),
    supabase.from("student_level_access").select("section_id").eq("user_id", userId),
  ]);
  const ids = new Set<string>();
  if (profile?.section_id) ids.add(profile.section_id as string);
  (extra ?? []).forEach((row: { section_id: string }) => ids.add(row.section_id));
  return Array.from(ids);
}

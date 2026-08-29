import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin: which extra levels a student can open (on top of their main level). */
export const getStudentLevelAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "students");

    const [{ data: profile }, { data: extra, error }] = await Promise.all([
      context.supabase.from("profiles").select("section_id").eq("id", data.userId).maybeSingle(),
      context.supabase.from("student_level_access").select("section_id").eq("user_id", data.userId),
    ]);
    if (error) throw new Error(error.message);
    return {
      mainSectionId: profile?.section_id ?? null,
      extraSectionIds: (extra ?? []).map((r: any) => r.section_id as string),
    };
  });

/** Admin: replace the full list of extra levels a student can open. */
export const setStudentLevelAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        sectionIds: z.array(z.string().uuid()).max(50),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "students");

    const { error: clearError } = await context.supabase
      .from("student_level_access")
      .delete()
      .eq("user_id", data.userId);
    if (clearError) throw new Error(clearError.message);

    const unique = Array.from(new Set(data.sectionIds));
    if (unique.length > 0) {
      const { error } = await context.supabase.from("student_level_access").insert(
        unique.map((sectionId) => ({
          user_id: data.userId,
          section_id: sectionId,
          granted_by: context.userId,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { success: true, count: unique.length };
  });

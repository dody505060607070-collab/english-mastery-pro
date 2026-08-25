import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { toProfileRole } from "@/lib/account.server";

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const supabase = context.supabase;

    const [profiles, courses, enrollments, activities, testResults, units, contents] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("courses").select("id, title, price, is_published"),
      supabase.from("enrollments").select("id", { count: "exact", head: true }),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("placement_test_results").select("level, score"),
      supabase.from("units").select("id", { count: "exact", head: true }),
      supabase.from("unit_contents").select("id", { count: "exact", head: true }),
    ]);

    const levelStatsRaw = (testResults.data || []).reduce((acc: Record<string, number>, curr) => {
      acc[curr.level] = (acc[curr.level] || 0) + 1;
      return acc;
    }, {});

    return {
      students: profiles.count || 0,
      coursesCount: courses.data?.length || 0,
      courses: courses.data || [],
      enrollments: enrollments.count || 0,
      unitsCount: units.count || 0,
      contentsCount: contents.count || 0,
      recentActivities: activities.data || [],
      levelStats: Object.entries(levelStatsRaw).map(([name, value]) => ({ name, value: Number(value) })),
      completionStats: [] as { name: string; completed: number; total: number }[],
    };
  });

export const getUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);

    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, { role: string }[]>();
    for (const r of roles || []) {
      const list = roleMap.get(r.user_id) || [];
      list.push({ role: r.role });
      roleMap.set(r.user_id, list);
    }

    return (data || []).map((p) => ({ ...p, user_roles: roleMap.get(p.id) || [] }));

  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string(),
        role: z.enum(["admin", "super_admin", "editor", "teacher", "student"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/staff.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ role: toProfileRole(data.role) }).eq("id", data.userId);

    await context.supabase.from("activity_logs").insert({
      user_id: context.userId,
      action: "UPDATE_ROLE",
      entity_type: "user",
      entity_id: data.userId,
      metadata: { new_role: data.role },
    });
    return { success: true };
  });

export const createCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        title: z.string().trim().min(1),
        description: z.string().trim().max(2000),
        level: z.string().trim().max(60),
        price: z.number().optional(),
        is_published: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);

    const { data: course, error } = await context.supabase
      .from("courses")
      .insert({
        title: data.title,
        description: data.description,
        level: data.level,
        price: data.price || 0,
        is_published: data.is_published || false,
        instructor_id: context.userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return course;
  });

export const updateCourseStructure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        courseId: z.string(),
        units: z.array(
          z.object({
            id: z.string().optional(),
            title: z.string(),
            order_index: z.number(),
            lessons: z.array(
              z.object({
                id: z.string().optional(),
                title: z.string(),
                order_index: z.number(),
                lesson_type: z
                  .enum(["Grammar", "Listening", "Reading", "Vocabulary", "Practice", "Tasks", "Test"])
                  .nullable()
                  .optional(),
              }),
            ),
          }),
        ),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const supabase = context.supabase;

    for (const unitData of data.units) {
      let unitId = unitData.id;

      if (unitId) {
        await supabase
          .from("units")
          .update({ title: unitData.title, order_index: unitData.order_index })
          .eq("id", unitId);
      } else {
        const { data: newUnit, error } = await supabase
          .from("units")
          .insert({ course_id: data.courseId, title: unitData.title, order_index: unitData.order_index })
          .select()
          .single();
        if (error) throw new Error(error.message);
        unitId = newUnit.id;
      }

      for (const lessonData of unitData.lessons) {
        const updateData: Record<string, unknown> = {
          title: lessonData.title,
          order_index: lessonData.order_index,
          unit_id: unitId,
        };
        if (lessonData.lesson_type !== undefined) updateData['lesson_type'] = lessonData.lesson_type;

        if (lessonData.id) {
          await supabase.from("lessons").update(updateData as never).eq("id", lessonData.id);
        } else {
          updateData['course_id'] = data.courseId;
          await supabase.from("lessons").insert(updateData as never);
        }
      }
    }

    return { success: true };
  });

export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().optional(),
        title: z.string().trim().min(1).max(160),
        message: z.string().trim().min(1).max(2000),
        type: z.enum(["info", "success", "warning", "error"]).optional(),
        scheduledFor: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);

    const { error } = await context.supabase.from("notifications").insert({
      user_id: data.userId || null,
      title: data.title,
      message: data.message,
      type: data.type || "info",
      scheduled_for: data.scheduledFor || new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

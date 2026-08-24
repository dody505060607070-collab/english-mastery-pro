import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const courseInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(160),
  short_description: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  level: z.string().trim().max(60).optional().nullable(),
  sub_level: z.string().trim().max(60).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  target_students: z.string().trim().max(200).optional().nullable(),
  thumbnail_url: z.string().trim().max(600).optional().nullable(),
  cover_url: z.string().trim().max(600).optional().nullable(),
  price: z.number().min(0).max(1000000).optional(),
  discount: z.number().min(0).max(1000000).optional(),
  duration_text: z.string().trim().max(80).optional().nullable(),
  is_published: z.boolean().optional(),
});

/** All courses (including drafts) with unit/lesson/enrollment counts, for staff. */
export const listCoursesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);

    const [courses, units, lessons, enrollments] = await Promise.all([
      context.supabase.from("courses").select("*").order("order_index").order("created_at", { ascending: false }),
      context.supabase.from("units").select("id, course_id"),
      context.supabase.from("lessons").select("id, course_id"),
      context.supabase.from("enrollments").select("id, course_id"),
    ]);
    if (courses.error) throw new Error(courses.error.message);

    const count = (rows: { course_id: string | null }[] | null, id: string) =>
      (rows ?? []).filter((r) => r.course_id === id).length;

    return (courses.data ?? []).map((c) => ({
      ...c,
      units_count: count(units.data, c.id),
      lessons_count: count(lessons.data, c.id),
      students_count: count(enrollments.data, c.id),
    }));
  });

/** Creates or updates a course. */
export const saveCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => courseInput.parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);

    const { id, ...fields } = data;
    const clean: Record<string, unknown> = { price: 0, discount: 0 };
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) clean[k] = v;


    if (id) {
      const { data: row, error } = await context.supabase
        .from("courses")
        .update(clean as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }

    const { data: row, error } = await context.supabase
      .from("courses")
      .insert({ ...clean, instructor_id: context.userId } as never)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setCoursePublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), is_published: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("courses")
      .update({ is_published: data.is_published })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("courses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Deep-copies a course with its units, lessons and unit contents as a draft. */
export const duplicateCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const sb = context.supabase;

    const { data: src, error } = await sb.from("courses").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);

    const { id: _id, created_at: _c, updated_at: _u, ...rest } = src as Record<string, unknown> as any;
    const { data: copy, error: cErr } = await sb
      .from("courses")
      .insert({ ...rest, title: `${src.title} (نسخة)`, is_published: false })
      .select()
      .single();
    if (cErr) throw new Error(cErr.message);

    const { data: units } = await sb.from("units").select("*").eq("course_id", data.id).order("order_index");
    const unitMap = new Map<string, string>();
    for (const u of units ?? []) {
      const { id: uid, created_at: _uc, ...uRest } = u as any;
      const { data: nu } = await sb
        .from("units")
        .insert({ ...uRest, course_id: copy.id })
        .select("id")
        .single();
      if (nu) unitMap.set(uid, nu.id);
    }

    const { data: contents } = await sb
      .from("unit_contents")
      .select("*")
      .in("unit_id", [...unitMap.keys()].length ? [...unitMap.keys()] : ["00000000-0000-0000-0000-000000000000"]);
    for (const ct of contents ?? []) {
      const { id: _ci, created_at: _cc, updated_at: _cu, ...cRest } = ct as any;
      const target = unitMap.get(ct.unit_id);
      if (target) await sb.from("unit_contents").insert({ ...cRest, unit_id: target });
    }

    const { data: lessons } = await sb.from("lessons").select("*").eq("course_id", data.id).order("order_index");
    for (const l of lessons ?? []) {
      const { id: _li, created_at: _lc, ...lRest } = l as any;
      await sb.from("lessons").insert({
        ...lRest,
        course_id: copy.id,
        unit_id: l.unit_id ? (unitMap.get(l.unit_id) ?? null) : null,
      });
    }

    return copy;
  });

export const reorderCourses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ ids: z.array(z.string().uuid()).max(500) }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    for (let i = 0; i < data.ids.length; i++) {
      await context.supabase.from("courses").update({ order_index: i }).eq("id", data.ids[i]!);
    }
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePhone, phoneRegex, phoneToEmail } from "@/lib/phone";

/* ------------------------------------------------------------------ stats */

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const supabase = context.supabase;

    const [students, blocked, sections, units, contents, courses, lessons, recent, activity] =
      await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_blocked", true),
        supabase.from("sections").select("id", { count: "exact", head: true }),
        supabase.from("units").select("id", { count: "exact", head: true }),
        supabase.from("unit_contents").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id, full_name, phone, avatar_url, created_at, is_blocked, sections:section_id (name)")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("content_progress")
          .select("content_id, completed_at, user_id")
          .order("completed_at", { ascending: false })
          .limit(8),
      ]);

    const total = students.count ?? 0;
    const blockedCount = blocked.count ?? 0;

    return {
      totalStudents: total,
      activeStudents: total - blockedCount,
      blockedStudents: blockedCount,
      sections: sections.count ?? 0,
      units: units.count ?? 0,
      contents: contents.count ?? 0,
      courses: courses.count ?? 0,
      lessons: lessons.count ?? 0,
      recentStudents: recent.data ?? [],
      recentActivity: activity.data ?? [],
    };
  });

/* --------------------------------------------------------------- students */

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        search: z.string().trim().max(100).optional(),
        sectionId: z.string().optional(),
        status: z.enum(["all", "active", "blocked"]).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "students");

    let query = context.supabase
      .from("profiles")
      .select(
        "id, full_name, phone, grade, avatar_url, is_blocked, created_at, section_id, unit_id, sections:section_id (id, name), units:unit_id (id, title)",
      )
      .order("created_at", { ascending: false });

    if (data.search) query = query.or(`full_name.ilike.%${data.search}%,phone.ilike.%${data.search}%`);
    if (data.sectionId && data.sectionId !== "all") query = query.eq("section_id", data.sectionId);
    if (data.status === "blocked") query = query.eq("is_blocked", true);
    if (data.status === "active") query = query.eq("is_blocked", false);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    const { data: roles } = ids.length
      ? await context.supabase.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as { user_id: string; role: string }[] };

    return (rows ?? []).map((r) => ({
      ...r,
      roles: (roles ?? []).filter((x) => x.user_id === r.id).map((x) => x.role as string),
    }));
  });

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        fullName: z.string().trim().min(3).max(100).optional(),
        grade: z.string().trim().max(60).nullable().optional(),
        sectionId: z.string().uuid().nullable().optional(),
        unitId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "students");

    const patch: {
      full_name?: string;
      grade?: string | null;
      section_id?: string | null;
      unit_id?: string | null;
    } = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName;
    if (data.grade !== undefined) patch.grade = data.grade;
    if (data.sectionId !== undefined) patch.section_id = data.sectionId;
    if (data.unitId !== undefined) patch.unit_id = data.unitId;

    const { error } = await context.supabase.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const setStudentBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "students");
    const { assertNotProtected } = await import("@/lib/staff.server");
    await assertNotProtected(data.userId);

    const { error } = await context.supabase
      .from("profiles")
      .update({ is_blocked: data.blocked })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin, assertNotProtected } = await import("@/lib/staff.server");
    await assertAdmin(context.supabase, context.userId);
    await assertNotProtected(data.userId);
    if (data.userId === context.userId) throw new Error("لا يمكنك حذف حسابك الخاص");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const createStudentByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        fullName: z.string().trim().min(3).max(100),
        phone: z.string().trim().min(10),
        password: z.string().min(6).max(72),
        sectionId: z.string().uuid(),
        grade: z.string().trim().max(60).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "students");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    if (!phoneRegex.test(phone)) throw new Error("رقم الهاتف غير صحيح");

    const email = phoneToEmail(phone);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone },
    });
    let user = created.user;
    if (error || !user) {
      const msg = (error?.message ?? "").toLowerCase();
      if (!msg.includes("already") && !msg.includes("registered") && !msg.includes("exists")) {
        throw new Error("تعذر إنشاء الحساب");
      }
      const { data: listed, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw new Error(listError.message);
      user = listed.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
      if (!user) throw new Error("الرقم مسجل بالفعل لكن لم نقدر نصلحه تلقائياً");
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName, phone },
      });
      if (updateError) throw new Error(updateError.message);
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      full_name: data.fullName,
      phone,
      section_id: data.sectionId,
      grade: data.grade ?? null,
      role: "student",
      is_blocked: false,
      approval_status: "approved",
      approved_at: new Date().toISOString(),
    } as never);
    if (profileError) {
      if (!error) await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw new Error(profileError.message);
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "student" }, { onConflict: "user_id,role" });
    if (roleError) {
      if (!error) await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw new Error(roleError.message);
    }

    return { success: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "teacher", "student"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, assertNotProtected } = await import("@/lib/staff.server");
    await assertAdmin(context.supabase, context.userId);
    if (data.role !== "admin") await assertNotProtected(data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ role: data.role }).eq("id", data.userId);
    return { success: true };
  });

/* --------------------------------------------------------------- sections */

export const listSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "curriculum");

    const [{ data: sections }, { data: units }, { data: students }] = await Promise.all([
      context.supabase.from("sections").select("*").order("order_index"),
      context.supabase.from("units").select("id, section_id"),
      context.supabase.from("profiles").select("id, section_id"),
    ]);

    return (sections ?? []).map((s) => ({
      ...s,
      unitCount: (units ?? []).filter((u) => u.section_id === s.id).length,
      studentCount: (students ?? []).filter((p) => p.section_id === s.id).length,
    }));
  });

export const saveSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300).nullable().optional(),
        order_index: z.number().int().min(0).optional(),
        is_visible: z.boolean().optional(),
        is_locked: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "curriculum");
    const supabase = context.supabase;

    if (data.id) {
      const { error } = await supabase
        .from("sections")
        .update({
          name: data.name,
          description: data.description ?? null,
          ...(data.order_index !== undefined ? { order_index: data.order_index } : {}),
          ...(data.is_visible !== undefined ? { is_visible: data.is_visible } : {}),
          ...(data.is_locked !== undefined ? { is_locked: data.is_locked } : {}),
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }

    const { data: last } = await supabase
      .from("sections")
      .select("order_index")
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("sections").insert({
      name: data.name,
      description: data.description ?? null,
      order_index: data.order_index ?? (last?.order_index ?? 0) + 1,
      is_visible: data.is_visible ?? true,
      is_locked: data.is_locked ?? false,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "curriculum");

    const { error } = await context.supabase.from("sections").delete().eq("id", data.id);
    if (error) throw new Error("لا يمكن حذف القسم، تأكد من نقل الطلاب والوحدات أولاً");
    return { success: true };
  });

export const reorderSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ items: z.array(z.object({ id: z.string().uuid(), order_index: z.number().int() })) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "curriculum");

    for (const item of data.items) {
      await context.supabase.from("sections").update({ order_index: item.order_index }).eq("id", item.id);
    }
    return { success: true };
  });

/* ------------------------------------------------------------------ units */

export const listUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sectionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "curriculum");

    const [{ data: section }, { data: units }] = await Promise.all([
      context.supabase.from("sections").select("*").eq("id", data.sectionId).maybeSingle(),
      context.supabase
        .from("units")
        .select("*")
        .eq("section_id", data.sectionId)
        .order("order_index"),
    ]);

    const unitIds = (units ?? []).map((u) => u.id);
    const { data: contents } = unitIds.length
      ? await context.supabase.from("unit_contents").select("id, unit_id, is_published").in("unit_id", unitIds)
      : { data: [] as { id: string; unit_id: string; is_published: boolean }[] };

    return {
      section,
      units: (units ?? []).map((u) => ({
        ...u,
        contentCount: (contents ?? []).filter((c) => c.unit_id === u.id).length,
        publishedCount: (contents ?? []).filter((c) => c.unit_id === u.id && c.is_published).length,
      })),
    };
  });

export const saveUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        sectionId: z.string().uuid(),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().max(500).nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "curriculum");
    const supabase = context.supabase;

    if (data.id) {
      const { error } = await supabase
        .from("units")
        .update({
          title: data.title,
          description: data.description ?? null,
          ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }

    const { data: last } = await supabase
      .from("units")
      .select("order_index")
      .eq("section_id", data.sectionId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("units").insert({
      section_id: data.sectionId,
      title: data.title,
      description: data.description ?? null,
      order_index: (last?.order_index ?? 0) + 1,
      is_active: data.is_active ?? true,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "curriculum");

    await context.supabase.from("unit_contents").delete().eq("unit_id", data.id);
    const { error } = await context.supabase.from("units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const duplicateUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "curriculum");
    const supabase = context.supabase;

    const { data: unit } = await supabase.from("units").select("*").eq("id", data.id).maybeSingle();
    if (!unit) throw new Error("الوحدة غير موجودة");

    const { data: newUnit, error } = await supabase
      .from("units")
      .insert({
        section_id: unit.section_id,
        course_id: unit.course_id,
        title: `${unit.title} (نسخة)`,
        description: unit.description,
        order_index: (unit.order_index ?? 0) + 1,
        is_active: false,
      })
      .select()
      .single();
    if (error || !newUnit) throw new Error(error?.message ?? "تعذر النسخ");

    const { data: contents } = await supabase.from("unit_contents").select("*").eq("unit_id", data.id);
    if (contents?.length) {
      await supabase.from("unit_contents").insert(
        contents.map((c) => ({
          unit_id: newUnit.id,
          content_type: c.content_type,
          title: c.title,
          body: c.body,
          media_url: c.media_url,
          data: (c as any).data ?? null,
          order_index: c.order_index,
          is_published: false,
        })),
      );
    }
    return { success: true };
  });

export const reorderUnits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ items: z.array(z.object({ id: z.string().uuid(), order_index: z.number().int() })) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "curriculum");
    for (const item of data.items) {
      await context.supabase.from("units").update({ order_index: item.order_index }).eq("id", item.id);
    }
    return { success: true };
  });

/* ---------------------------------------------------------------- content */

export const listUnitContents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ unitId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "content");

    const [{ data: unit }, { data: contents }] = await Promise.all([
      context.supabase
        .from("units")
        .select("*, sections:section_id (id, name)")
        .eq("id", data.unitId)
        .maybeSingle(),
      context.supabase.from("unit_contents").select("*").eq("unit_id", data.unitId).order("order_index"),
    ]);

    return { unit, contents: contents ?? [] };
  });

export const saveUnitContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        unitId: z.string().uuid(),
        content_type: z.string().trim().min(1).max(40),
        title: z.string().trim().min(1).max(160),
        body: z.string().max(20000).nullable().optional(),
        media_url: z.string().trim().max(600).nullable().optional(),
        data: z.any().optional(),
        is_published: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "content");
    const supabase = context.supabase;

    if (data.id) {
      const { error } = await supabase
        .from("unit_contents")
        .update({
          content_type: data.content_type,
          title: data.title,
          body: data.body ?? null,
          media_url: data.media_url || null,
          ...(data.data !== undefined ? { data: data.data } : {}),
          ...(data.is_published !== undefined ? { is_published: data.is_published } : {}),
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }

    const { data: last } = await supabase
      .from("unit_contents")
      .select("order_index")
      .eq("unit_id", data.unitId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("unit_contents").insert({
      unit_id: data.unitId,
      content_type: data.content_type,
      title: data.title,
      body: data.body ?? null,
      media_url: data.media_url || null,
      data: data.data ?? null,
      order_index: (last?.order_index ?? 0) + 1,
      is_published: data.is_published ?? false,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteUnitContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "content");
    const { error } = await context.supabase.from("unit_contents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const reorderUnitContents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ items: z.array(z.object({ id: z.string().uuid(), order_index: z.number().int() })) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "content");
    for (const item of data.items) {
      await context.supabase.from("unit_contents").update({ order_index: item.order_index }).eq("id", item.id);
    }
    return { success: true };
  });

/** Duplicate a whole level (section) with all its units and their content. */
export const duplicateSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80).optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "curriculum");
    const supabase = context.supabase;

    const { data: section } = await supabase.from("sections").select("*").eq("id", data.id).maybeSingle();
    if (!section) throw new Error("المستوى غير موجود");

    const { data: last } = await supabase
      .from("sections")
      .select("order_index")
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: newSection, error } = await supabase
      .from("sections")
      .insert({
        name: data.name ?? `${section.name} (نسخة)`,
        description: section.description,
        order_index: (last?.order_index ?? 0) + 1,
        is_visible: false,
        is_locked: false,
      })
      .select()
      .single();
    if (error || !newSection) throw new Error(error?.message ?? "تعذر نسخ المستوى");

    const { data: units } = await supabase
      .from("units")
      .select("*")
      .eq("section_id", data.id)
      .order("order_index");

    for (const u of units ?? []) {
      const { data: newUnit } = await supabase
        .from("units")
        .insert({
          section_id: newSection.id,
          title: u.title,
          description: u.description,
          order_index: u.order_index,
          is_active: u.is_active,
          is_published: (u as any).is_published ?? true,
        })
        .select()
        .single();
      if (!newUnit) continue;

      const { data: contents } = await supabase.from("unit_contents").select("*").eq("unit_id", u.id);
      if (contents?.length) {
        await supabase.from("unit_contents").insert(
          contents.map((c) => ({
            unit_id: newUnit.id,
            content_type: c.content_type,
            title: c.title,
            body: c.body,
            media_url: c.media_url,
            data: (c as any).data ?? null,
            order_index: c.order_index,
            is_published: c.is_published,
          })),
        );
      }
    }

    return { success: true, id: newSection.id };
  });

/* ------------------------------------------------- users & roles (admin) */

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/staff.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: rows, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url, is_blocked, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    const { data: roles } = ids.length
      ? await context.supabase.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as { user_id: string; role: string }[] };

    return (rows ?? []).map((r) => ({
      ...r,
      roles: (roles ?? []).filter((x) => x.user_id === r.id).map((x) => x.role as string),
    }));
  });

/** Creates a user with an explicit role (admin only). */
export const createUserWithRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        fullName: z.string().trim().min(3).max(100),
        phone: z.string().trim().min(10),
        password: z.string().min(6).max(72),
        role: z.enum(["admin", "teacher", "student"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/staff.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    if (!phoneRegex.test(phone)) throw new Error("رقم الهاتف غير صحيح");

    const email = phoneToEmail(phone);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone },
    });
    let user = created.user;
    if (error || !user) {
      const msg = (error?.message ?? "").toLowerCase();
      if (!msg.includes("already") && !msg.includes("registered") && !msg.includes("exists")) {
        throw new Error("تعذر إنشاء الحساب");
      }
      const { data: listed, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw new Error(listError.message);
      user = listed.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
      if (!user) throw new Error("الرقم مسجل بالفعل لكن لم نقدر نصلحه تلقائياً");
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName, phone },
      });
      if (updateError) throw new Error(updateError.message);
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      full_name: data.fullName,
      phone,
      role: data.role,
      is_blocked: false,
      approval_status: "approved",
      approved_at: new Date().toISOString(),
    } as never);
    if (profileError) {
      if (!error) await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw new Error(profileError.message);
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role: data.role });
    if (roleError) {
      if (!error) await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw new Error(roleError.message);
    }

    return { success: true };
  });

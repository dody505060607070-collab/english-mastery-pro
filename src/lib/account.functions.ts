import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePhone, phoneRegex, phoneToEmail } from "@/lib/phone";
import { ADMIN_PHONES, decodeDataUrl, readStaffAllowlist, requireAdmin, saveStaffAllowlist } from "@/lib/account.server";
export type { StaffAllowEntry } from "@/lib/account.server";

/** Public signup — always creates a STUDENT account, never an admin. */
export const signUpStudent = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        fullName: z.string().trim().min(3).max(100),
        phone: z.string().trim().min(10),
        password: z.string().min(6).max(72),
        sectionId: z.string().uuid().optional().nullable(),
        grade: z.string().trim().max(60).optional().nullable(),
        unitId: z.string().uuid().optional().nullable(),
        avatarBase64: z.string().max(4_000_000).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    if (!phoneRegex.test(phone)) throw new Error("رقم الهاتف غير صحيح");
    const email = phoneToEmail(phone);

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone },
    });

    const createdUser = created?.user ?? null;
    if (createError || !createdUser) {
      const msg = (createError?.message || "").toLowerCase();
      if (msg.includes("already")) throw new Error("رقم الهاتف مسجل بالفعل");
      throw new Error("تعذر إنشاء الحساب، حاول مرة أخرى");
    }

    const userId = createdUser.id;
    const isAdminPhone = ADMIN_PHONES.includes(phone);

    let avatarPath: string | null = null;
    if (data.avatarBase64) {
      const decoded = decodeDataUrl(data.avatarBase64);
      if (decoded) {
        const path = `${userId}/avatar-${Date.now()}.${decoded.ext}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("avatars")
          .upload(path, decoded.bytes, { contentType: decoded.mime, upsert: true });
        if (!upErr) avatarPath = path;
      }
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: data.fullName,
      phone,
      section_id: data.sectionId ?? null,
      grade: data.grade ?? null,
      unit_id: data.unitId ?? null,
      avatar_url: avatarPath,
      role: isAdminPhone ? "admin" : "student",
      is_blocked: false,
      approval_status: isAdminPhone ? "approved" : "pending",
    } as never);


    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("تعذر حفظ بيانات الطالب");
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: isAdminPhone ? "admin" : "student" },
        { onConflict: "user_id,role" },
      );

    return { success: true, isAdmin: isAdminPhone };
  });

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("*, sections:section_id (id, name), units:unit_id (id, title)")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    let roleList = (roles || []).map((r) => r.role as string);

    // The designated admin phone always owns the admin panel, even if the
    // account was created before that rule existed.
    const ownPhone = normalizePhone(((profile as any)?.phone as string | undefined) ?? "");
    if (ownPhone && ADMIN_PHONES.includes(ownPhone) && !roleList.includes("admin")) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      await supabaseAdmin
        .from("profiles")
        .update({ role: "admin", approval_status: "approved", is_blocked: false })
        .eq("id", userId);
      roleList = [...roleList, "admin"];
    }
    const isStaff = roleList.some((r) =>
      ["admin", "super_admin", "teacher", "instructor", "editor"].includes(r),
    );

    const p = profile as any;
    return {
      userId,
      profile: profile ?? null,
      roles: roleList,
      isAdmin: roleList.some((r) => ["admin", "super_admin"].includes(r)),
      isStaff,
      isBlocked: !!profile?.is_blocked,
      approvalStatus: (p?.approval_status as string | undefined) ?? "approved",
      approvalNote: (p?.approval_note as string | null | undefined) ?? null,
    };
  });


export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        fullName: z.string().trim().min(3).max(100).optional(),
        phone: z.string().trim().optional(),
        avatarPath: z.string().max(300).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: { full_name?: string; phone?: string; avatar_url?: string | null } = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName;
    const phone = data.phone !== undefined ? normalizePhone(data.phone) : undefined;
    if (phone !== undefined) {
      if (!phoneRegex.test(phone)) throw new Error("Invalid phone number");
      patch.phone = phone;
    }
    if (data.avatarPath !== undefined) patch.avatar_url = data.avatarPath;
    if (Object.keys(patch).length === 0) return { success: true };

    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    if (phone !== undefined || data.fullName !== undefined) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
        ...(phone !== undefined ? { email: phoneToEmail(phone), email_confirm: true } : {}),
        user_metadata: {
          ...(data.fullName !== undefined ? { full_name: data.fullName } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
      });
      if (authError) throw new Error(authError.message);
    }
    return { success: true };
  });

/** One-time bootstrap: promotes the signed-in user to admin only when the platform has no admin yet. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .in("role", ["admin", "super_admin"]);

    if ((count ?? 0) > 0) throw new Error("يوجد مدير بالفعل على المنصة");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("profiles").update({ role: "admin" }).eq("id", context.userId);
    return { success: true };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .in("role", ["admin", "super_admin"]);
  return { exists: (count ?? 0) > 0 };
});

/* -------------------------------------------------- staff signup allowlist */

/** Admin-only: list phones allowed to self-register as admin/teacher. */
export const listStaffPhones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    return await readStaffAllowlist();
  });

/** Admin-only: replace the allowlist. */
export const saveStaffPhones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        entries: z
          .array(
            z.object({
              phone: z.string().trim().min(10),
              role: z.enum(["admin", "teacher"]),
            }),
          )
          .max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const seen = new Set<string>();
    const entries = data.entries
      .map((e) => ({ ...e, phone: normalizePhone(e.phone) }))
      .filter((e) => phoneRegex.test(e.phone) && !seen.has(e.phone) && seen.add(e.phone));
    await saveStaffAllowlist(entries);
    return { success: true, entries };
  });

/** Public: is this phone allowed to create a staff account? */
export const checkStaffPhone = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ phone: z.string().trim().min(10) }).parse(data))
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    if (!phoneRegex.test(phone)) return { allowed: false, role: null };
    if (ADMIN_PHONES.includes(phone)) return { allowed: true, role: "admin" as const };
    const entry = (await readStaffAllowlist()).find((e) => e.phone === phone);
    return entry ? { allowed: true, role: entry.role } : { allowed: false, role: null };
  });

/** Self sign-up for admins/teachers whose phone was pre-approved by an admin. */
export const signUpStaff = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        fullName: z.string().trim().min(3).max(100),
        phone: z.string().trim().min(10),
        password: z.string().min(6).max(72),
        avatarBase64: z.string().max(4_000_000).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    if (!phoneRegex.test(phone)) throw new Error("رقم الهاتف غير صحيح");
    let role: "admin" | "teacher" | null = ADMIN_PHONES.includes(phone) ? "admin" : null;
    if (!role) {
      const entry = (await readStaffAllowlist()).find((e) => e.phone === phone);
      role = entry?.role ?? null;
    }
    if (!role) throw new Error("هذا الرقم غير مصرح له بإنشاء حساب مدير أو مدرس");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = phoneToEmail(phone);
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone },
    });
    let user = created?.user ?? null;
    const wasExisting = !!createError;
    if (createError || !user) {
      const msg = (createError?.message || "").toLowerCase();
      if (!msg.includes("already") && !msg.includes("registered") && !msg.includes("exists")) {
        throw new Error("تعذر إنشاء الحساب، حاول مرة أخرى");
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
    const userId = user.id;

    let avatarPath: string | null = null;
    if (data.avatarBase64) {
      const decoded = decodeDataUrl(data.avatarBase64);
      if (decoded) {
        const path = `${userId}/avatar-${Date.now()}.${decoded.ext}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("avatars")
          .upload(path, decoded.bytes, { contentType: decoded.mime, upsert: true });
        if (!upErr) avatarPath = path;
      }
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: data.fullName,
      phone,
      avatar_url: avatarPath,
      role,
      is_blocked: false,
      approval_status: "approved",
    } as never);
    if (profileError) {
      if (!wasExisting) await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("تعذر حفظ البيانات");
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
    if (roleError) {
      if (!wasExisting) await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("تعذر حفظ الصلاحية");
    }

    return { success: true, role };
  });

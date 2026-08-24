import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const phoneRegex = /^[0-9]{10,15}$/;

/** This phone always owns the admin panel. */
export const ADMIN_PHONES = ["01222576172"];

export const phoneToEmail = (phone: string) => `${phone.trim()}@academy.com`;

const signUpSchema = z.object({
  fullName: z.string().trim().min(3).max(100),
  phone: z.string().trim().regex(phoneRegex),
  password: z.string().min(6).max(72),
  sectionId: z.string().uuid(),
  grade: z.string().trim().max(60).optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  // data URL of the selected photo
  avatarBase64: z.string().max(4_000_000).optional().nullable(),
});

function decodeDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1]!;
  const bytes = Uint8Array.from(atob(match[2]!), (c) => c.charCodeAt(0));
  if (bytes.byteLength > 3_000_000) return null;
  return { mime, bytes, ext: mime.split("/")[1]!.replace("jpeg", "jpg") };
}

/** Public signup — always creates a STUDENT account, never an admin. */
export const signUpStudent = createServerFn({ method: "POST" })
  .inputValidator((data) => signUpSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = phoneToEmail(data.phone);

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone },
    });

    if (createError || !created.user) {
      const msg = (createError?.message || "").toLowerCase();
      if (msg.includes("already")) throw new Error("رقم الهاتف مسجل بالفعل");
      throw new Error("تعذر إنشاء الحساب، حاول مرة أخرى");
    }

    const userId = created.user.id;
    const isAdminPhone = ADMIN_PHONES.includes(data.phone.trim());

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
      phone: data.phone,
      section_id: data.sectionId,
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
    const ownPhone = ((profile as any)?.phone as string | undefined)?.trim();
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
        avatarPath: z.string().max(300).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch: { full_name?: string; avatar_url?: string | null } = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName;
    if (data.avatarPath !== undefined) patch.avatar_url = data.avatarPath;
    if (Object.keys(patch).length === 0) return { success: true };

    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
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

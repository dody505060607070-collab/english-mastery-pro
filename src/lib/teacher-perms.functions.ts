import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Capability list shared with the UI (kept in sync with staff.server). */
export const CAPABILITY_LABELS: { id: string; label: string; hint: string }[] = [
  { id: "curriculum", label: "Levels & Units", hint: "Create / edit levels and units" },
  { id: "content", label: "Unit Content", hint: "Lessons, exercises, vocabulary inside units" },
  { id: "students", label: "Students", hint: "View and edit student accounts" },
  { id: "approvals", label: "Registration Requests", hint: "Approve or reject new students" },
  { id: "courses", label: "Courses", hint: "Manage courses and their lessons" },
  { id: "recordings", label: "Recordings", hint: "Record and publish lectures" },
  { id: "live", label: "Live Sessions", hint: "Create live classes" },
  { id: "vocabulary", label: "Dictionary", hint: "Manage the global dictionary" },
  { id: "notifications", label: "Notifications", hint: "Send notifications to students" },
  { id: "analytics", label: "Analytics", hint: "See progress reports" },
  { id: "payments", label: "Payments", hint: "Review payment requests" },
];

/** Admin: every teacher with their effective capabilities. */
export const listTeacherPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, getCapabilityMap, DEFAULT_TEACHER_CAPS, CAPABILITIES } = await import(
      "@/lib/staff.server"
    );
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase;

    const [{ data: roles }, map] = await Promise.all([
      supabase.from("user_roles").select("user_id, role"),
      getCapabilityMap(supabase),
    ]);

    const teacherIds = (roles ?? [])
      .filter((r) => ["teacher", "instructor", "editor"].includes(r.role as string))
      .map((r) => r.user_id);

    const { data: profiles } = teacherIds.length
      ? await supabase.from("profiles").select("id, full_name, phone, avatar_url").in("id", teacherIds)
      : { data: [] as any[] };

    return {
      capabilities: [...CAPABILITIES] as string[],
      defaults: DEFAULT_TEACHER_CAPS as string[],
      teachers: (profiles ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        avatar_url: p.avatar_url,
        caps: (map[p.id] ?? DEFAULT_TEACHER_CAPS) as string[],
        customised: !!map[p.id],
      })),
    };
  });

/** Admin: overwrite one teacher's capability list. */
export const setTeacherPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), caps: z.array(z.string()).max(40) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, getCapabilityMap, CAPABILITIES } = await import("@/lib/staff.server");
    await assertAdmin(context.supabase, context.userId);

    const allowed = new Set<string>(CAPABILITIES as readonly string[]);
    const caps = data.caps.filter((c) => allowed.has(c));

    const map = await getCapabilityMap(context.supabase);
    map[data.userId] = caps;

    const { error } = await context.supabase
      .from("site_content")
      .upsert({ key: "teacher.permissions", value: map }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { success: true, caps };
  });

/** Any staff member: what am I allowed to do (drives the admin menu). */
export const getMyCapabilities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getCapabilities } = await import("@/lib/staff.server");
    const { isAdmin, caps } = await getCapabilities(context.supabase, context.userId);
    return { isAdmin, caps };
  });

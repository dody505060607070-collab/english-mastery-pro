import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const liveSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  meetUrl: z.string().trim().min(5).max(500),
  platform: z.enum(["youtube", "tiktok", "meet"]).optional(),
  sectionId: z.string().uuid().optional().nullable(),
  isLive: z.boolean().optional(),
  startsAt: z.string().optional().nullable(),
});

/** Student view: currently broadcasting sessions. */
export const getLiveSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("live_sessions")
      .select("id, title, description, meeting_url, platform, starts_at, is_live, section_id, sections:section_id (name)")
      .eq("is_live", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Admin view: every session. */
export const listLiveSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);

    const { data, error } = await context.supabase
      .from("live_sessions")
      .select("id, title, description, meeting_url, platform, starts_at, is_live, section_id, created_at, sections:section_id (name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveLiveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => liveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);

    const payload = {
      title: data.title,
      description: data.description ?? null,
      meeting_url: data.meetUrl,
      platform: data.platform ?? "youtube",
      section_id: data.sectionId || null,
      is_live: data.isLive ?? false,
      starts_at: data.startsAt || null,
    };

    if (data.id) {
      const { error } = await context.supabase.from("live_sessions").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true, id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("live_sessions")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { success: true, id: created.id };
  });

export const setLiveStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), isLive: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("live_sessions")
      .update({ is_live: data.isLive })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteLiveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("live_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

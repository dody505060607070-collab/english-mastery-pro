import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Student view: published recordings for their level (or for everyone). */
export const getStudentRecordings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAccessibleSectionIds } = await import("@/lib/level-access.server");
    const [{ data: roles }, allowedSectionIds] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      getAccessibleSectionIds(context.supabase, context.userId),
    ]);
    const isStaff = (roles ?? []).some((r) =>
      ["admin", "super_admin", "teacher", "instructor", "editor"].includes(r.role as string),
    );

    let query = context.supabase
      .from("lecture_recordings")
      .select(
        "id, title, description, video_url, thumbnail_url, duration_seconds, recorded_at, section_id, sections:section_id (name)",
      )
      .eq("is_published", true)
      .order("recorded_at", { ascending: false });
    // Students only see recordings for the levels they were granted (or global ones).
    if (!isStaff) {
      query = allowedSectionIds.length
        ? query.or(`section_id.is.null,section_id.in.(${allowedSectionIds.join(",")})`)
        : query.is("section_id", null);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const recordings = data ?? [];
    const isR2 = (v?: string | null) => !!v && v.startsWith("r2:");
    const isStored = (v?: string | null) => !!v && !v.startsWith("http") && !isR2(v);
    const paths = recordings.flatMap((recording) => {
      const list: string[] = [];
      if (isStored(recording.video_url)) list.push(recording.video_url as string);
      const thumb = (recording as any).thumbnail_url as string | null;
      if (isStored(thumb)) list.push(thumb as string);
      return list;
    });
    const signedByPath = new Map<string, string>();
    if (paths.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage.from("content").createSignedUrls(paths, 60 * 60 * 6);
      signed?.forEach((item) => {
        if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
      });
    }
    const r2Map = new Map<string, string>();
    const r2Keys = recordings
      .flatMap((r) => [r.video_url, (r as any).thumbnail_url as string | null])
      .filter((v): v is string => isR2(v));
    if (r2Keys.length > 0) {
      const { r2PlaybackUrl } = await import("@/lib/r2.server");
      await Promise.all(
        [...new Set(r2Keys)].map(async (v) => {
          try {
            r2Map.set(v, await r2PlaybackUrl(v.slice(3)));
          } catch {
            /* R2 not configured */
          }
        }),
      );
    }
    const resolve = (v?: string | null) =>
      !v ? null : v.startsWith("http") ? v : isR2(v) ? r2Map.get(v) ?? null : signedByPath.get(v) ?? null;
    return recordings.map((recording) => ({
      ...recording,
      playback_url: resolve(recording.video_url),
      cover_url: resolve((recording as any).thumbnail_url),
    }));
  });


/** Admin view: every recording. */
export const listRecordings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "recordings");

    const { data, error } = await context.supabase
      .from("lecture_recordings")
      .select(
        "id, title, description, video_url, thumbnail_url, duration_seconds, status, is_published, recorded_at, section_id, live_session_id, sections:section_id (name)",
      )
      .order("recorded_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const paths = rows.flatMap((r) => {
      const list: string[] = [];
      if (r.video_url && !r.video_url.startsWith("http")) list.push(r.video_url);
      if (r.thumbnail_url && !r.thumbnail_url.startsWith("http")) list.push(r.thumbnail_url);
      return list;
    });
    const signedByPath = new Map<string, string>();
    if (paths.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage.from("content").createSignedUrls(paths, 60 * 60 * 6);
      signed?.forEach((item) => {
        if (item.path && item.signedUrl) signedByPath.set(item.path, item.signedUrl);
      });
    }
    const resolve = (v: string | null) => (!v ? null : v.startsWith("http") ? v : signedByPath.get(v) ?? null);
    return rows.map((r) => ({ ...r, playback_url: resolve(r.video_url), cover_url: resolve(r.thumbnail_url) }));
  });

/** Files sitting in storage that were uploaded but never linked to a recording row. */
export const listOrphanRecordingFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "recordings");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: files, error } = await supabaseAdmin.storage
      .from("content")
      .list("recordings", { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);

    const { data: rows } = await context.supabase.from("lecture_recordings").select("video_url");
    const used = new Set((rows ?? []).map((r) => r.video_url).filter(Boolean) as string[]);

    return (files ?? [])
      .filter((f) => f.name && !used.has(`recordings/${f.name}`))
      .map((f) => ({
        path: `recordings/${f.name}`,
        name: f.name,
        size: (f.metadata as any)?.size ?? 0,
        mimetype: (f.metadata as any)?.mimetype ?? "",
        created_at: f.created_at ?? null,
      }));
  });

/** Turn an orphan storage file into a published recording. */
export const adoptRecordingFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        path: z.string().trim().min(3).max(1000),
        title: z.string().trim().min(2).max(180),
        sectionId: z.string().uuid().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "recordings");
    const { data: created, error } = await context.supabase
      .from("lecture_recordings")
      .insert({
        title: data.title,
        video_url: data.path,
        section_id: data.sectionId || null,
        status: "ready",
        is_published: true,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { success: true, id: created.id };
  });

export const saveRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      id: z.string().uuid().optional(),
      liveSessionId: z.string().uuid().optional().nullable(),
      sectionId: z.string().uuid().optional().nullable(),
      title: z.string().trim().min(2).max(180),
      description: z.string().trim().max(2000).optional().nullable(),
      videoUrl: z.string().trim().max(1000).optional().nullable(),
      thumbnailUrl: z.string().trim().max(1000).optional().nullable(),
      durationSeconds: z.number().int().min(0).max(60 * 60 * 12).optional().nullable(),
      status: z.enum(["recording", "ready", "failed"]).optional(),
      isPublished: z.boolean().optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "recordings");

    const payload = {
      title: data.title,
      description: data.description ?? null,
      video_url: data.videoUrl || null,
      thumbnail_url: data.thumbnailUrl ?? null,
      duration_seconds: data.durationSeconds ?? null,
      section_id: data.sectionId || null,
      live_session_id: data.liveSessionId || null,
      status: data.status ?? (data.videoUrl ? "ready" : "recording"),
      is_published: data.isPublished ?? false,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("lecture_recordings")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { success: true, id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("lecture_recordings")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { success: true, id: created.id };
  });

export const setRecordingPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), isPublished: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "recordings");
    const { error } = await context.supabase
      .from("lecture_recordings")
      .update({ is_published: data.isPublished })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "recordings");
    const { data: recording, error: readError } = await context.supabase
      .from("lecture_recordings")
      .select("video_url, thumbnail_url")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    const { error } = await context.supabase.from("lecture_recordings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    const all = [recording?.video_url, recording?.thumbnail_url].filter((v): v is string => Boolean(v));
    const r2Keys = all.filter((v) => v.startsWith("r2:")).map((v) => v.slice(3));
    const storedPaths = all.filter((v) => !v.startsWith("http") && !v.startsWith("r2:"));
    if (storedPaths.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: storageError } = await supabaseAdmin.storage.from("content").remove(storedPaths);
      if (storageError) throw new Error(`The recording was deleted, but its stored file could not be removed: ${storageError.message}`);
    }
    if (r2Keys.length > 0) {
      const { deleteR2Object } = await import("@/lib/r2.server");
      await Promise.all(r2Keys.map((k) => deleteR2Object(k).catch(() => undefined)));
    }

    return { success: true };
  });

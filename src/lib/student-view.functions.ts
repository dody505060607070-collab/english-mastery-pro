import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STAFF_ROLES = ["admin", "super_admin", "teacher", "instructor", "editor"];

/**
 * Admin/teacher tool: preview exactly what a student assigned to a given level
 * would be able to see (visible level, active units, published contents,
 * published recordings). Read-only, no impersonation.
 */
export const getStudentView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sectionId: z.string().uuid().nullish() }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isStaff = (roles ?? []).some((r) => STAFF_ROLES.includes(r.role as string));
    if (!isStaff) throw new Error("Not authorized");

    const { data: sections } = await supabase
      .from("sections")
      .select("id, name, is_visible, is_locked, order_index")
      .order("order_index");

    const levels = (sections ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      is_visible: s.is_visible,
      is_locked: s.is_locked,
    }));

    const sectionId = data.sectionId ?? levels[0]?.id ?? null;
    const level = levels.find((l) => l.id === sectionId) ?? null;

    if (!sectionId || !level) {
      return { levels, sectionId: null, level: null, units: [], recordings: [], blocked: false };
    }

    const blocked = !level.is_visible || level.is_locked;

    const { data: units } = await supabase
      .from("units")
      .select("id, title, order_index, is_active, is_published")
      .eq("section_id", sectionId)
      .order("order_index");

    const visibleUnits = (units ?? []).filter((u) => u.is_active && u.is_published !== false);
    const unitIds = visibleUnits.map((u) => u.id);

    const { data: contents } = unitIds.length
      ? await supabase
          .from("unit_contents")
          .select("id, unit_id, title, content_type, order_index, is_published")
          .in("unit_id", unitIds)
          .order("order_index")
      : { data: [] as any[] };

    const { data: recordings } = await supabase
      .from("lecture_recordings")
      .select("id, title, section_id, recorded_at")
      .eq("is_published", true)
      .or(`section_id.is.null,section_id.eq.${sectionId}`)
      .order("recorded_at", { ascending: false })
      .limit(20);

    return {
      levels,
      sectionId,
      level,
      blocked,
      hiddenUnits: (units ?? []).length - visibleUnits.length,
      units: visibleUnits.map((u) => ({
        id: u.id,
        title: u.title,
        contents: (contents ?? [])
          .filter((c: any) => c.unit_id === u.id && c.is_published)
          .map((c: any) => ({ id: c.id, title: c.title, content_type: c.content_type })),
        hiddenContents: (contents ?? []).filter((c: any) => c.unit_id === u.id && !c.is_published).length,
      })),
      recordings: recordings ?? [],
    };
  });

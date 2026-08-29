import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public: sections + their active units, used by the signup form. */
export const getPublicCurriculum = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: sections }, { data: units }] = await Promise.all([
    supabaseAdmin
      .from("sections")
      .select("id, name, description, order_index")
      .eq("is_visible", true)
      .order("order_index"),
    supabaseAdmin
      .from("units")
      .select("id, title, section_id, order_index")
      .eq("is_active", true)
      .order("order_index"),
  ]);

  return {
    sections: sections ?? [],
    units: (units ?? []).filter((u) => !!u.section_id),
  };
});

/** Student view: their own section, its units, content counts and personal progress. */
export const getMyCurriculum = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("section_id, unit_id, grade, sections:section_id (id, name, description)")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.section_id) {
      return { section: null, units: [], completedIds: [], totalContents: 0, completedCount: 0 };
    }

    const { data: units } = await supabase
      .from("units")
      .select("id, title, description, order_index")
      .eq("section_id", profile.section_id)
      .eq("is_active", true)
      .order("order_index");

    const unitIds = (units ?? []).map((u) => u.id);

    const { data: contents } = unitIds.length
      ? await supabase
          .from("unit_contents")
          .select("id, unit_id, content_type")
          .in("unit_id", unitIds)
          .eq("is_published", true)
      : { data: [] as { id: string; unit_id: string; content_type: string }[] };

    const { data: progress } = await supabase
      .from("content_progress")
      .select("content_id, unit_id, is_completed")
      .eq("user_id", userId)
      .eq("is_completed", true);

    const completedIds = (progress ?? []).map((p) => p.content_id);
    const completedSet = new Set(completedIds);

    const unitsWithStats = (units ?? []).map((u) => {
      const items = (contents ?? []).filter((c) => c.unit_id === u.id);
      const done = items.filter((c) => completedSet.has(c.id)).length;
      return {
        ...u,
        total: items.length,
        completed: done,
        progress: items.length ? Math.round((done / items.length) * 100) : 0,
        types: Array.from(new Set(items.map((c) => c.content_type))),
      };
    });

    const totalContents = (contents ?? []).length;
    const completedCount = (contents ?? []).filter((c) => completedSet.has(c.id)).length;

    return {
      section: (profile as any).sections ?? null,
      currentUnitId: profile.unit_id ?? null,
      units: unitsWithStats,
      completedIds,
      totalContents,
      completedCount,
      overallProgress: totalContents ? Math.round((completedCount / totalContents) * 100) : 0,
    };
  });

/** Content of a single unit, restricted to the student's own section (staff see all). */
export const getUnitDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ unitId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { getAccessibleSectionIds } = await import("@/lib/level-access.server");
    const [{ data: profile }, { data: roles }, allowedSectionIds] = await Promise.all([
      supabase.from("profiles").select("section_id, is_blocked").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      getAccessibleSectionIds(supabase, userId),
    ]);

    const isStaff = (roles ?? []).some((r) =>
      ["admin", "super_admin", "teacher", "instructor", "editor"].includes(r.role as string),
    );

    if (profile?.is_blocked) throw new Error("Account is blocked");

    const { data: unit, error } = await supabase
      .from("units")
      .select("id, title, description, section_id, is_active, sections:section_id (id, name, is_visible, is_locked)")
      .eq("id", data.unitId)
      .maybeSingle();

    if (error || !unit) throw new Error("Unit not found");
    const section = (unit as any).sections as
      | { id: string; name: string; is_visible: boolean; is_locked: boolean }
      | null;
    // A student may only open units of the levels the admin granted them,
    // and only while that level is visible and unlocked.
    if (!isStaff) {
      if (!section || section.is_visible === false || section.is_locked === true) {
        throw new Error("This level is currently locked, contact the administration to unlock it");
      }
      if (!allowedSectionIds.includes((unit as any).section_id)) {
        throw new Error("You do not have permission to access this content");
      }
    }


    let query = supabase
      .from("unit_contents")
      .select("*")
      .eq("unit_id", data.unitId)
      .order("order_index");
    if (!isStaff) query = query.eq("is_published", true);

    const [{ data: contents }, { data: progress }, { data: vocab }, { data: attempts }] = await Promise.all([
      query,
      supabase
        .from("content_progress")
        .select("content_id, is_completed")
        .eq("user_id", userId)
        .eq("unit_id", data.unitId),
      supabase
        .from("vocab_progress")
        .select("content_id, word, learned")
        .eq("user_id", userId)
        .eq("unit_id", data.unitId),
      supabase
        .from("exercise_attempts")
        .select("content_id, score, max_score, percentage, needs_review, created_at")
        .eq("user_id", userId)
        .eq("unit_id", data.unitId)
        .order("created_at", { ascending: false }),
    ]);

    // Unit vocabulary was historically stored as a snapshot in unit_contents.data.
    // Overlay the editable vocabulary dictionary so admin changes are visible to students immediately.
    const unitWords = (contents ?? []).flatMap((content) => {
      if (content.content_type !== "vocabulary") return [];
      const rawData = content.data && typeof content.data === "object" ? content.data as Record<string, unknown> : {};
      const words = Array.isArray(rawData["words"]) ? rawData["words"] : [];
      const storedWords = words
        .map((word) => word && typeof word === "object" && typeof (word as Record<string, unknown>)["word"] === "string"
          ? String((word as Record<string, unknown>)["word"])
          : "")
        .filter(Boolean);
      if (storedWords.length) return storedWords;
      return (content.body ?? "")
        .split("\n")
        .filter((line) => /^\|.+\|$/.test(line.trim()))
        .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
        .filter((row) => /^\/.+\/$/.test(row[1] ?? ""))
        .map((row) => row[0] ?? "")
        .filter(Boolean);
    });
    const { data: dictionaryWords } = unitWords.length
      ? await supabase
          .from("vocabulary")
          .select("word, translation, phonetic, phonetic_uk, example, example_ar, audio_url, audio_url_uk, category")
      : { data: [] };
    const dictionary = new Map(
      (dictionaryWords ?? []).map((word) => [word.word.trim().toLowerCase(), word]),
    );
    const visibleContents = (contents ?? []).map((content) => {
      if (content.content_type !== "vocabulary" || !content.data || typeof content.data !== "object") return content;
      const rawData = content.data as Record<string, unknown>;
      const embeddedWords = Array.isArray(rawData["words"])
        ? rawData["words"]
        : (content.body ?? "")
            .split("\n")
            .filter((line) => /^\|.+\|$/.test(line.trim()))
            .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
            .filter((row) => /^\/.+\/$/.test(row[1] ?? ""))
            .map((row) => ({ word: row[0] ?? "", phonetic: (row[1] ?? "").replace(/^\/|\/$/g, ""), translation: row[2] ?? null, example: row[3] ?? null }));
      if (!embeddedWords.length) return content;
      return {
        ...content,
        data: {
          ...rawData,
          words: embeddedWords.map((rawWord) => {
            if (!rawWord || typeof rawWord !== "object") return rawWord;
            const word = rawWord as Record<string, unknown>;
            const current = typeof word["word"] === "string" ? dictionary.get(word["word"].trim().toLowerCase()) : undefined;
            if (!current) return rawWord;
            return {
              ...word,
              translation: current.translation,
              phonetic: current.phonetic,
              phonetic_uk: current.phonetic_uk,
              example: current.example,
              example_ar: current.example_ar,
              word_audio: current.audio_url,
              word_audio_uk: current.audio_url_uk,
              category: current.category,
            };
          }),
        },
      };
    });

    return {
      unit,
      contents: visibleContents,
      completedIds: (progress ?? []).filter((p) => p.is_completed).map((p) => p.content_id),
      learnedWords: (vocab ?? []).filter((v) => v.learned),
      attempts: attempts ?? [],
    };
  });

export const setContentProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        contentId: z.string().uuid(),
        unitId: z.string().uuid(),
        completed: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase.from("content_progress").upsert(
      {
        user_id: userId,
        content_id: data.contentId,
        unit_id: data.unitId,
        is_completed: data.completed,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,content_id" },
    );
    if (error) throw new Error(error.message);

    await supabase.from("profiles").update({ unit_id: data.unitId }).eq("id", userId);

    return { success: true };
  });

/** Save a graded exercise attempt (Reading / Listening / Practice / Task / Test).
 *  Scores are always recomputed on the server from the stored answer key —
 *  anything the client sends about score/results is ignored. */
export const submitExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        contentId: z.string().uuid(),
        unitId: z.string().uuid(),
        answers: z.record(z.string(), z.any()).default({}),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { gradeAll } = await import("@/lib/exercise-types");

    const { data: content, error: contentError } = await supabase
      .from("unit_contents")
      .select("id, unit_id, data")
      .eq("id", data.contentId)
      .eq("unit_id", data.unitId)
      .maybeSingle();
    if (contentError || !content) throw new Error("Content not found");

    const questions = (((content as any).data ?? {}).questions ?? []) as any[];
    const graded = gradeAll(questions, data.answers as any);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("exercise_attempts").insert({
      user_id: userId,
      content_id: data.contentId,
      unit_id: data.unitId,
      answers: data.answers,
      results: graded.results as unknown as any,
      score: graded.score,
      max_score: graded.maxScore,
      percentage: graded.percentage,
      needs_review: graded.needsReview,
    });
    if (error) throw new Error(error.message);


    await supabase.from("content_progress").upsert(
      {
        user_id: userId,
        content_id: data.contentId,
        unit_id: data.unitId,
        is_completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,content_id" },
    );

    return { success: true };
  });

/** Mark a vocabulary word as learned / not learned. */
export const setVocabLearned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        contentId: z.string().uuid(),
        unitId: z.string().uuid(),
        word: z.string().trim().min(1).max(120),
        learned: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("vocab_progress").upsert(
      {
        user_id: userId,
        content_id: data.contentId,
        unit_id: data.unitId,
        word: data.word,
        learned: data.learned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,content_id,word" },
    );
    if (error) throw new Error(error.message);
    return { success: true };
  });

/* ------------------------------------------------------------------ levels */

/** All selectable levels (sections). Non-sequential: no level depends on another. */
export const getLevels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: roles }, { data: profile }, { data: sections }, { data: units }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("section_id").eq("id", userId).maybeSingle(),
      supabase.from("sections").select("id, name, description, order_index, is_visible, is_locked").order("order_index"),
      supabase.from("units").select("id, section_id, is_active"),
    ]);

    const isStaff = (roles ?? []).some((r) =>
      ["admin", "super_admin", "teacher", "instructor", "editor"].includes(r.role as string),
    );

    const visible = (sections ?? []).filter((s) => isStaff || s.is_visible);

    return {
      isStaff,
      myLevelId: profile?.section_id ?? null,
      levels: visible.map((s) => ({
        ...s,
        unitCount: (units ?? []).filter((u) => u.section_id === s.id && (isStaff || u.is_active)).length,
        locked: !isStaff && s.is_locked,
      })),
    };
  });

/** Units + personal progress of ONE level, independent of every other level. */
export const getLevelUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ sectionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: roles }, { data: section }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("sections")
        .select("id, name, description, is_visible, is_locked")
        .eq("id", data.sectionId)
        .maybeSingle(),
    ]);

    const isStaff = (roles ?? []).some((r) =>
      ["admin", "super_admin", "teacher", "instructor", "editor"].includes(r.role as string),
    );

    if (!section) throw new Error("Level not found");
    if (!isStaff && (!section.is_visible || section.is_locked)) {
      return { section, locked: true, units: [], totalContents: 0, completedCount: 0, overallProgress: 0 };
    }

    let unitsQuery = supabase
      .from("units")
      .select("id, title, description, order_index, is_active")
      .eq("section_id", data.sectionId)
      .order("order_index");
    if (!isStaff) unitsQuery = unitsQuery.eq("is_active", true);

    const { data: units } = await unitsQuery;
    const unitIds = (units ?? []).map((u) => u.id);

    const { data: contents } = unitIds.length
      ? await supabase
          .from("unit_contents")
          .select("id, unit_id, content_type")
          .in("unit_id", unitIds)
          .eq("is_published", true)
      : { data: [] as { id: string; unit_id: string; content_type: string }[] };

    const { data: progress } = await supabase
      .from("content_progress")
      .select("content_id, is_completed")
      .eq("user_id", userId)
      .eq("is_completed", true);

    const done = new Set((progress ?? []).map((p) => p.content_id));

    const unitsWithStats = (units ?? []).map((u) => {
      const items = (contents ?? []).filter((c) => c.unit_id === u.id);
      const completed = items.filter((c) => done.has(c.id)).length;
      return {
        ...u,
        total: items.length,
        completed,
        progress: items.length ? Math.round((completed / items.length) * 100) : 0,
        types: Array.from(new Set(items.map((c) => c.content_type))),
      };
    });

    const totalContents = (contents ?? []).length;
    const completedCount = (contents ?? []).filter((c) => done.has(c.id)).length;

    return {
      section,
      locked: false,
      units: unitsWithStats,
      totalContents,
      completedCount,
      overallProgress: totalContents ? Math.round((completedCount / totalContents) * 100) : 0,
    };
  });

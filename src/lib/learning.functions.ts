import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const wordSchema = z.object({ word: z.string().trim().min(1).max(60) });

export type WordInfo = {
  word: string;
  translation: string;
  phonetic: string | null;
  example: string | null;
};

/** Looks up the Arabic meaning of an English word, cached in the database. */
export const lookupWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => wordSchema.parse(data))
  .handler(async ({ data, context }): Promise<WordInfo> => {
    const word = data.word.toLowerCase().replace(/[^a-z'-]/g, "");
    if (!word) throw new Error("Invalid word");

    const cached = await context.supabase
      .from("translation_cache")
      .select("word, translation, phonetic, example")
      .eq("word", word)
      .maybeSingle();
    if (cached.data) return cached.data as WordInfo;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Translation service is currently unavailable");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              'You are an English-Arabic learner dictionary. Reply with ONLY minified JSON: {"translation":"<arabic meaning, short>","phonetic":"<IPA>","example":"<short English example sentence>"}',
          },
          { role: "user", content: word },
        ],
      }),
    });

    if (!res.ok) throw new Error("Could not fetch the translation, try again");
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    let parsed: { translation?: string; phonetic?: string; example?: string } = {};
    try {
      parsed = match ? JSON.parse(match[0]) : {};
    } catch {
      parsed = {};
    }
    const info: WordInfo = {
      word,
      translation: parsed.translation?.trim() || "—",
      phonetic: parsed.phonetic?.trim() || null,
      example: parsed.example?.trim() || null,
    };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("translation_cache").upsert(info, { onConflict: "word" });
    return info;
  });

export const saveMyWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        word: z.string().trim().min(1).max(60),
        translation: z.string().trim().max(200).optional(),
        phonetic: z.string().trim().max(120).optional(),
        example: z.string().trim().max(400).optional(),
        example_ar: z.string().trim().max(400).optional(),
        part_of_speech: z.string().trim().max(40).optional(),
        starred: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_vocabulary").upsert(
      {
        user_id: context.userId,
        word: data.word.toLowerCase(),
        translation: data.translation ?? null,
        phonetic: data.phonetic ?? null,
        example: data.example ?? null,
        example_ar: data.example_ar ?? null,
        part_of_speech: data.part_of_speech ?? null,
        ...(data.starred === undefined ? {} : { starred: data.starred }),
      },
      { onConflict: "user_id,word" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Updates the student's own study fields on a saved word. */
export const updateMyWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        starred: z.boolean().optional(),
        mastered: z.boolean().optional(),
        notes: z.string().trim().max(1000).nullable().optional(),
        translation: z.string().trim().max(200).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("user_vocabulary")
      .update(patch)
      .eq("id", id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyWords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_vocabulary")
      .select("*")
      .eq("user_id", context.userId)
      .order("starred", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteMyWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_vocabulary")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

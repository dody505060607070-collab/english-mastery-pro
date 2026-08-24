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
    if (!word) throw new Error("كلمة غير صالحة");

    const cached = await context.supabase
      .from("translation_cache")
      .select("word, translation, phonetic, example")
      .eq("word", word)
      .maybeSingle();
    if (cached.data) return cached.data as WordInfo;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("خدمة الترجمة غير متاحة حاليًا");

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

    if (!res.ok) throw new Error("تعذر جلب الترجمة، حاول مرة أخرى");
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
      },
      { onConflict: "user_id,word" },
    );
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

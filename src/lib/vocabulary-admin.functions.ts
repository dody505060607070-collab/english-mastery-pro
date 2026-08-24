import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const wordSchema = z.object({
  id: z.string().uuid().optional(),
  word: z.string().trim().min(1).max(80),
  translation: z.string().trim().min(1).max(200),
  phonetic: z.string().trim().max(120).nullable().optional(),
  phonetic_uk: z.string().trim().max(120).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  example_ar: z.string().trim().max(400).nullable().optional(),
  audio_url: z.string().trim().max(500).nullable().optional(),
  is_premium: z.boolean().optional(),
});

export type AdminWord = {
  id: string;
  word: string;
  translation: string;
  phonetic: string | null;
  phonetic_uk: string | null;
  category: string | null;
  example_ar: string | null;
  audio_url: string | null;
  is_premium: boolean | null;
};

/** All dictionary words for the admin table. */
export const listVocabulary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminWord[]> => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("vocabulary")
      .select("id, word, translation, phonetic, phonetic_uk, category, example_ar, audio_url, is_premium")
      .order("word", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminWord[];
  });

/** Create or update a dictionary word. */
export const saveVocabulary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => wordSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      word: data.word.toLowerCase(),
      translation: data.translation,
      phonetic: data.phonetic ?? null,
      phonetic_uk: data.phonetic_uk ?? null,
      category: data.category ?? null,
      example_ar: data.example_ar ?? null,
      audio_url: data.audio_url ?? null,
      is_premium: data.is_premium ?? false,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("vocabulary").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("vocabulary")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id as string };
  });

/** Delete a dictionary word. */
export const deleteVocabulary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("vocabulary").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Auto-fill translation, phonetics and an Arabic example using AI. */
export const enrichWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ word: z.string().trim().min(1).max(80) }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("خدمة الذكاء الاصطناعي غير متاحة");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              'Reply with ONLY minified JSON: {"translation":"<short Arabic meaning>","phonetic":"<US IPA>","phonetic_uk":"<UK IPA>","category":"<one English topic word>","example_ar":"<short Arabic example sentence>"}',
          },
          { role: "user", content: data.word },
        ],
      }),
    });
    if (!res.ok) throw new Error("تعذر جلب البيانات، حاول مرة أخرى");
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const match = (json.choices?.[0]?.message?.content ?? "").match(/\{[\s\S]*\}/);
    if (!match) throw new Error("تعذر تحليل النتيجة");
    const parsed = JSON.parse(match[0]) as Record<string, string>;
    return {
      translation: parsed["translation"] ?? "",
      phonetic: parsed["phonetic"] ?? "",
      phonetic_uk: parsed["phonetic_uk"] ?? "",
      category: parsed["category"] ?? "",
      example_ar: parsed["example_ar"] ?? "",
    };
  });

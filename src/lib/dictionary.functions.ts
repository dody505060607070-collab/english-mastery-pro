import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DictExample = { en: string; ar: string };
export type DictSense = {
  part_of_speech: string;
  definition_en: string;
  definition_ar: string;
  examples: DictExample[];
};
export type DictEntry = {
  word: string;
  phonetic: string | null;
  translation: string;
  senses: DictSense[];
  synonyms: string[];
  antonyms: string[];
  forms: { label: string; value: string }[];
  notFound?: boolean;
  suggestion?: string | null;
};

const wordSchema = z.object({ word: z.string().trim().min(1).max(60) });

const normalize = (raw: string) => raw.toLowerCase().trim().replace(/[^a-z' -]/g, "");

const emptyEntry = (word: string, suggestion: string | null = null): DictEntry => ({
  word,
  phonetic: null,
  translation: "—",
  senses: [],
  synonyms: [],
  antonyms: [],
  forms: [],
  notFound: true,
  suggestion,
});

function coerce(word: string, parsed: any): DictEntry {
  const senses: DictSense[] = Array.isArray(parsed?.senses)
    ? parsed.senses.slice(0, 5).map((s: any) => ({
        part_of_speech: String(s?.part_of_speech ?? "").trim() || "—",
        definition_en: String(s?.definition_en ?? "").trim(),
        definition_ar: String(s?.definition_ar ?? "").trim(),
        examples: Array.isArray(s?.examples)
          ? s.examples.slice(0, 3).map((e: any) => ({
              en: String(e?.en ?? "").trim(),
              ar: String(e?.ar ?? "").trim(),
            }))
          : [],
      }))
    : [];
  return {
    word,
    phonetic: parsed?.phonetic ? String(parsed.phonetic).trim() : null,
    translation: String(parsed?.translation ?? "").trim() || senses[0]?.definition_ar || "—",
    senses,
    synonyms: Array.isArray(parsed?.synonyms) ? parsed.synonyms.slice(0, 8).map(String) : [],
    antonyms: Array.isArray(parsed?.antonyms) ? parsed.antonyms.slice(0, 8).map(String) : [],
    forms: Array.isArray(parsed?.forms)
      ? parsed.forms
          .slice(0, 8)
          .map((f: any) => ({ label: String(f?.label ?? "").trim(), value: String(f?.value ?? "").trim() }))
          .filter((f: any) => f.label && f.value)
      : [],
    notFound: parsed?.is_english === false,
    suggestion: parsed?.suggestion ? String(parsed.suggestion).trim().toLowerCase() : null,
  };
}

const SYSTEM_PROMPT = `You are a bilingual English-Arabic learner's dictionary API.
Reply with ONLY minified JSON, no markdown, matching exactly:
{"is_english":true|false,"suggestion":"<closest correctly spelled English word if the input is misspelled or not English, else null>","phonetic":"<IPA of the word, e.g. /ˈæp.əl/>","translation":"<short Arabic meaning, 1-4 words>","senses":[{"part_of_speech":"noun|verb|adjective|adverb|preposition|pronoun|conjunction|interjection","definition_en":"<simple English definition>","definition_ar":"<Arabic definition>","examples":[{"en":"<short natural example sentence>","ar":"<Arabic translation of the example>"}]}],"synonyms":["..."],"antonyms":["..."],"forms":[{"label":"Plural|Past|Past participle|Present participle|Third person|Comparative|Superlative","value":"..."}]}
Give 1-3 senses. Always include at least one example per sense with its Arabic translation. Use [] when a field has no data.`;

async function askAI(word: string): Promise<DictEntry> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Dictionary service is currently unavailable");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: word },
      ],
    }),
  });
  if (res.status === 429) throw new Error("The service is busy right now, try again in a moment");
  if (!res.ok) throw new Error("Could not fetch the word's meaning, try again");
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return emptyEntry(word);
  try {
    return coerce(word, JSON.parse(match[0]));
  } catch {
    return emptyEntry(word);
  }
}

/** Full dictionary lookup: meaning, POS, definitions, examples, synonyms, forms. Cached in DB. */
export const lookupEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => wordSchema.parse(data))
  .handler(async ({ data, context }): Promise<DictEntry> => {
    const word = normalize(data.word);
    if (!word) throw new Error("Type a valid English word");

    const cached = await context.supabase
      .from("translation_cache")
      .select("word, translation, phonetic, entry")
      .eq("word", word)
      .maybeSingle();
    if (cached.data?.entry) return cached.data.entry as unknown as DictEntry;

    const entry = await askAI(word);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("translation_cache").upsert(
      {
        word,
        translation: entry.translation,
        phonetic: entry.phonetic,
        example: entry.senses[0]?.examples[0]?.en ?? null,
        entry: JSON.parse(JSON.stringify(entry)),
      },
      { onConflict: "word" },
    );
    return entry;
  });

/** Typeahead suggestions from previously looked-up words and the student's own list. */
export const suggestWords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ q: z.string().trim().max(60) }).parse(data))
  .handler(async ({ data, context }) => {
    const q = normalize(data.q);
    if (q.length < 2) return [] as { word: string; translation: string | null }[];
    const { data: rows } = await context.supabase
      .from("translation_cache")
      .select("word, translation")
      .ilike("word", `${q}%`)
      .limit(8);
    return (rows ?? []) as { word: string; translation: string | null }[];
  });

/** Recently looked-up words shared across the platform (a "popular words" strip). */
export const recentWords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("translation_cache")
      .select("word, translation")
      .order("created_at", { ascending: false })
      .limit(12);
    return (data ?? []) as { word: string; translation: string | null }[];
  });

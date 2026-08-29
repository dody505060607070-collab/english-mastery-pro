import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only: regenerate every vocabulary example as ONE short simple
 * English sentence containing the word, plus its Arabic translation.
 * Processes in batches; pass offset/limit to resume.
 */
export const regenerateVocabExamples = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(2000).default(2000),
        batchSize: z.number().int().min(5).max(40).default(25),
      })
      .parse(data ?? {})
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "vocabulary");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI service is unavailable");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: words, error } = await supabaseAdmin
      .from("vocabulary")
      .select("id, word, translation")
      .order("word", { ascending: true })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);
    const rows = (words ?? []) as { id: string; word: string; translation: string }[];

    let updated = 0;
    const failures: string[] = [];

    for (let i = 0; i < rows.length; i += data.batchSize) {
      const batch = rows.slice(i, i + data.batchSize);
      const list = batch.map((w, j) => `${j + 1}. ${w.word} (${w.translation})`).join("\n");
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  'For each numbered English word, write ONE short simple example sentence (max 10 words) that naturally uses the exact word, plus an Arabic translation of THAT sentence. Reply with ONLY minified JSON: {"items":[{"n":1,"example":"...","example_ar":"..."},...]} with one item per input line, same order.',
              },
              { role: "user", content: list },
            ],
          }),
        });
        if (!res.ok) throw new Error(`AI ${res.status}`);
        const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const match = (json.choices?.[0]?.message?.content ?? "").match(/\{[\s\S]*\}/);
        if (!match) throw new Error("parse");
        const parsed = JSON.parse(match[0]) as {
          items?: { n: number; example?: string; example_ar?: string }[];
        };
        for (const item of parsed.items ?? []) {
          const target = batch[(item.n ?? 0) - 1];
          if (!target || !item.example || !item.example_ar) continue;
          if (!item.example.toLowerCase().includes(target.word.toLowerCase().split(" ")[0]!)) {
            failures.push(target.word);
            continue;
          }
          const { error: upErr } = await supabaseAdmin
            .from("vocabulary")
            .update({ example: item.example.trim(), example_ar: item.example_ar.trim() })
            .eq("id", target.id);
          if (upErr) failures.push(target.word);
          else updated++;
        }
      } catch {
        failures.push(...batch.map((w) => w.word));
      }
    }

    return { total: rows.length, updated, failed: failures.length, failedWords: failures.slice(0, 30) };
  });

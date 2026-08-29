import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({ text: z.string().trim().min(1).max(8000) });

/** Translates an English passage into clear Modern Standard Arabic. */
export const translatePassage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }): Promise<{ arabic: string }> => {
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
              "Translate the user's English text into clear, simple Modern Standard Arabic for language learners. Keep the same paragraph and line structure. Reply with the Arabic translation only, no notes.",
          },
          { role: "user", content: data.text },
        ],
      }),
    });

    if (!res.ok) throw new Error("Could not translate the text, try again");
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const arabic = (json.choices?.[0]?.message?.content ?? "").trim();
    if (!arabic) throw new Error("Could not translate the text, try again");
    return { arabic };
  });

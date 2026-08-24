import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  text: z.string().trim().min(1).max(2000),
  voice: z.string().trim().max(30).optional(),
});

export type SpeechResult = { url: string; path: string; cached: boolean };

/**
 * Generates (or reuses) a real MP3 file for the given text and returns a playable URL.
 * Real audio files work on every device/browser, unlike the browser SpeechSynthesis API
 * which is unreliable on iOS Safari and many Android browsers.
 */
export const synthesizeSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }): Promise<SpeechResult> => {
    const text = data.text.replace(/\s+/g, " ").trim();
    const voice = data.voice || "alloy";

    const { createHash } = await import("crypto");
    const id = createHash("sha256").update(`${voice}::${text}`).digest("hex").slice(0, 40);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const sign = async (path: string) => {
      const { data: signed } = await supabaseAdmin.storage
        .from("content")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!signed?.signedUrl) throw new Error("تعذر تجهيز رابط الصوت");
      return signed.signedUrl;
    };

    const cached = await context.supabase
      .from("tts_cache")
      .select("path")
      .eq("id", id)
      .maybeSingle();
    if (cached.data?.path) {
      return { url: await sign(cached.data.path), path: cached.data.path, cached: true };
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("خدمة الصوت غير متاحة حاليًا");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: text,
        voice,
        response_format: "mp3",
        speed: 0.95,
        instructions: "Speak clearly and slowly, like a friendly English teacher for beginners.",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("الخدمة مشغولة الآن، حاول بعد قليل");
      if (res.status === 402) throw new Error("رصيد خدمة الصوت غير كافٍ، تواصل مع الإدارة");
      throw new Error(`تعذر إنشاء الصوت (${res.status}) ${detail.slice(0, 120)}`);
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (!bytes.byteLength) throw new Error("لم يتم إنشاء ملف صوتي");

    const path = `tts/${id}.mp3`;
    const up = await supabaseAdmin.storage.from("content").upload(path, bytes, {
      contentType: "audio/mpeg",
      cacheControl: "31536000",
      upsert: true,
    });
    if (up.error) throw new Error(up.error.message);

    await supabaseAdmin.from("tts_cache").upsert({ id, text, voice, path }, { onConflict: "id" });

    return { url: await sign(path), path, cached: false };
  });

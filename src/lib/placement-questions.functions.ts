import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns placement test questions WITHOUT the answer key.
 * Students have no direct read access to `placement_tests`, so grading stays
 * server-side and `correct_answer` never reaches the browser.
 */
export const getPlacementQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("placement_tests")
      .select("id, question, options, category, difficulty_weight, audio_url, reading_passage, created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  });

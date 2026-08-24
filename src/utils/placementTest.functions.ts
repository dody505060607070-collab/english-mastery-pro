import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { awardXp } from "@/lib/xp.server";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const submitPlacementTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    answers: z.array(z.object({
      questionId: z.string(),
      answer: z.string(),
      category: z.string()
    }))
  }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const user = { id: context.userId };

    // Fetch questions to verify answers
    const { data: questions, error: fetchError } = await supabase
      .from("placement_tests")
      .select("id, correct_answer, category, difficulty_weight");

    if (fetchError || !questions) throw new Error("Failed to fetch questions");


    let totalScore = 0;
    let maxPossibleScore = 0;
    const categoryResults: Record<string, { correct: number, total: number }> = {
      vocabulary: { correct: 0, total: 0 },
      grammar: { correct: 0, total: 0 },
      reading: { correct: 0, total: 0 },
      listening: { correct: 0, total: 0 },
    };

    data.answers.forEach(userAnswer => {
      const question = questions.find(q => q.id === userAnswer.questionId);
      if (question) {
        const weight = Number(question.difficulty_weight) || 1.0;
        maxPossibleScore += weight;
        
        const cat = question.category as keyof typeof categoryResults;
        if (categoryResults[cat]) {
          categoryResults[cat].total += 1;
          
          if (question.correct_answer === userAnswer.answer) {
            totalScore += weight;
            categoryResults[cat].correct += 1;
          }
        }
      }
    });

    const percentage = (totalScore / maxPossibleScore) * 100;
    
    // Level Calculation
    let level: typeof CEFR_LEVELS[number] = "A1";
    if (percentage > 90) level = "C2";
    else if (percentage > 80) level = "C1";
    else if (percentage > 60) level = "B2";
    else if (percentage > 40) level = "B1";
    else if (percentage > 20) level = "A2";

    // Analyze Strengths and Weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    Object.entries(categoryResults).forEach(([cat, res]) => {
      const catPercent = (res.correct / res.total) * 100;
      if (catPercent >= 70) strengths.push(`Strong ${cat} skills`);
      else if (catPercent < 40) weaknesses.push(`Needs improvement in ${cat}`);
    });

    // Save Results with the privileged client: learners must not be able to
    // write their own placement score directly through the Data API.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: saveError } = await supabaseAdmin
      .from("placement_test_results")
      .insert({
        user_id: user.id,
        score: percentage,
        level,
        strengths,
        weaknesses,
        category_scores: categoryResults
      });

    if (saveError) throw saveError;

    // Update User Profile Level
    await supabase
      .from("profiles")
      .update({ level } as any)
      .eq("id", user.id);

    // Grant XP for completing the test (one-time)
    await awardXp(user.id, "placement_test");


    return {
      level,
      score: percentage,
      strengths,
      weaknesses,
      categoryResults
    };
  });

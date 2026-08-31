import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  studentAnswer: z.string().trim().min(1).max(4000),
  expectedAnswer: z.string().trim().max(2000).optional().nullable(),
  kind: z.enum(["fill", "text"]).default("text"),
});

export interface AiGrade {
  correct: boolean;
  feedback: string;
  correctAnswer: string;
}

/** Grades an open student answer with Groq (free tier) and returns correct/wrong instantly. */
export const gradeAnswerWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }): Promise<AiGrade> => {
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) throw new Error("Automatic grading is unavailable right now");

    const system =
      "You are a strict but fair English teacher grading a student's answer. " +
      "Judge meaning and grammar, ignore capitalization and minor typos. " +
      "If a reference answer is given, treat any answer with the same meaning as correct. " +
      'Reply with JSON only: {"correct": true|false, "feedback": "one short sentence for the student", "correct_answer": "the ideal short answer"}';

    const user = [
      `Question: ${data.prompt}`,
      data.expectedAnswer ? `Reference answer: ${data.expectedAnswer}` : "Reference answer: (none given)",
      `Student answer: ${data.studentAnswer}`,
    ].join("\n");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) throw new Error("Could not grade the answer, try again");
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { correct?: boolean; feedback?: string; correct_answer?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return {
      correct: parsed.correct === true,
      feedback: String(parsed.feedback ?? "").slice(0, 300),
      correctAnswer: String(parsed.correct_answer ?? data.expectedAnswer ?? "").slice(0, 300),
    };
  });

/** Shared question model used by Reading / Listening / Practice / Task / Test. */
export type QuestionType = "mcq" | "truefalse" | "multi" | "fill" | "order" | "match" | "text";

export interface MatchPair {
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  tokens?: string[];
  pairs?: MatchPair[];
  /** mcq/truefalse/fill: string. multi/order: string[]. */
  answer?: string | string[];
  points?: number;
  /** Shown after checking, explains why the answer is correct. */
  explanation?: string;
}

export type AnswerValue = string | string[] | Record<string, string> | undefined;

export interface ExerciseData {
  questions?: Question[];
  /** reading */
  image_url?: string | null;
  /** listening */
  transcript?: string | null;
  max_plays?: number | null;
  /** vocabulary */
  words?: VocabWord[];
  /** test settings */
  time_limit_minutes?: number | null;
  attempts_allowed?: number | null;
  pass_score?: number | null;
}

export interface VocabWord {
  word: string;
  translation?: string;
  example?: string;
  example_ar?: string;
  image_url?: string | null;
  word_audio?: string | null;
  sentence_audio?: string | null;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple choice (A/B/C/D)",
  truefalse: "True / False",
  multi: "Multiple answers",
  fill: "Fill in the blank",
  order: "Word order",
  match: "Matching",
  text: "Written answer (manual grading)",
};

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

export interface QuestionResult {
  id: string;
  /** null = needs manual review */
  correct: boolean | null;
  earned: number;
  points: number;
  yourAnswer: string;
  correctAnswer: string;
}

export function displayAnswer(q: Question, value: AnswerValue): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.join(" , ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([l, r]) => `${l} → ${r}`)
      .join(" | ");
  }
  return String(value);
}

export function correctAnswerText(q: Question): string {
  if (q.type === "match") return (q.pairs ?? []).map((p) => `${p.left} → ${p.right}`).join(" | ");
  if (Array.isArray(q.answer)) return q.answer.join(" , ");
  if (q.type === "text") return "Graded by the teacher";
  return String(q.answer ?? "—");
}

export function gradeQuestion(q: Question, value: AnswerValue): QuestionResult {
  const points = Number(q.points ?? 1);
  const base = {
    id: q.id,
    points,
    yourAnswer: displayAnswer(q, value),
    correctAnswer: correctAnswerText(q),
  };

  if (q.type === "text") return { ...base, correct: null, earned: 0 };

  let correct = false;
  if (q.type === "multi") {
    const expected = (Array.isArray(q.answer) ? q.answer : []).map(norm).sort();
    const given = (Array.isArray(value) ? value : []).map(norm).sort();
    correct = expected.length > 0 && expected.length === given.length && expected.every((v, i) => v === given[i]);
  } else if (q.type === "order") {
    const expected = (Array.isArray(q.answer) ? q.answer : []).map(norm);
    const given = (Array.isArray(value) ? value : []).map(norm);
    correct = expected.length > 0 && expected.length === given.length && expected.every((v, i) => v === given[i]);
  } else if (q.type === "match") {
    const map = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, string>;
    const pairs = q.pairs ?? [];
    correct = pairs.length > 0 && pairs.every((p) => norm(map[p.left]) === norm(p.right));
  } else if (q.type === "fill") {
    const accepted = String(q.answer ?? "")
      .split("|")
      .map(norm)
      .filter(Boolean);
    correct = accepted.includes(norm(value));
  } else {
    correct = norm(q.answer) !== "" && norm(q.answer) === norm(value);
  }

  return { ...base, correct, earned: correct ? points : 0 };
}

export function gradeAll(questions: Question[], answers: Record<string, AnswerValue>) {
  const results = questions.map((q) => gradeQuestion(q, answers[q.id]));
  const maxScore = results.reduce((s, r) => s + r.points, 0);
  const score = results.reduce((s, r) => s + r.earned, 0);
  const autoMax = results.filter((r) => r.correct !== null).reduce((s, r) => s + r.points, 0);
  return {
    results,
    score,
    maxScore,
    percentage: autoMax ? Math.round((score / autoMax) * 100) : 0,
    correctCount: results.filter((r) => r.correct === true).length,
    wrongCount: results.filter((r) => r.correct === false).length,
    needsReview: results.some((r) => r.correct === null),
  };
}

export function newQuestion(type: QuestionType): Question {
  const id = `q_${Math.random().toString(36).slice(2, 9)}`;
  switch (type) {
    case "truefalse":
      return { id, type, prompt: "", answer: "true", points: 1 };
    case "multi":
      return { id, type, prompt: "", options: ["", "", "", ""], answer: [], points: 2 };
    case "fill":
      return { id, type, prompt: "", answer: "", points: 1 };
    case "order":
      return { id, type, prompt: "", tokens: ["", "", ""], answer: [], points: 2 };
    case "match":
      return { id, type, prompt: "", pairs: [{ left: "", right: "" }], points: 2 };
    case "text":
      return { id, type, prompt: "", points: 5 };
    default:
      return { id, type: "mcq", prompt: "", options: ["", "", "", ""], answer: "", points: 1 };
  }
}

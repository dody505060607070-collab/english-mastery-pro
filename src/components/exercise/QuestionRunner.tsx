import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RotateCcw, Clock, Loader2, HelpCircle, Lightbulb, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { gradeAnswerWithAI, type AiGrade } from "@/lib/ai-grade.functions";
import {
  gradeAll,
  gradeQuestion,
  OPTION_LETTERS,
  type AnswerValue,
  type Question,
  type QuestionResult,
} from "@/lib/exercise-types";

/** Types the AI grades instead of plain string matching. */
const AI_TYPES = new Set(["text", "fill"]);

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}


export interface RunnerSubmitPayload {
  answers: Record<string, AnswerValue>;
  results: QuestionResult[];
  score: number;
  maxScore: number;
  percentage: number;
  needsReview: boolean;
}

export function QuestionRunner({
  questions,
  onSubmit,
  submitting,
  submitLabel = "Finish",
  timeLimitMinutes,
  passScore,
  allowRetry = true,
}: {
  questions: Question[];
  onSubmit?: ((payload: RunnerSubmitPayload) => void) | undefined;
  submitting?: boolean | undefined;
  submitLabel?: string | undefined;
  timeLimitMinutes?: number | null | undefined;
  passScore?: number | null | undefined;
  allowRetry?: boolean | undefined;
}) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [revealed, setRevealed] = useState<Record<string, true>>({});
  const [aiById, setAiById] = useState<Record<string, AiGrade>>({});
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<RunnerSubmitPayload | null>(null);
  const [attemptKey, setAttemptKey] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    timeLimitMinutes ? timeLimitMinutes * 60 : null,
  );

  const total = questions.length;
  const q = questions[Math.min(index, Math.max(total - 1, 0))];
  const isRevealed = q ? !!revealed[q.id] : false;

  /** Local grading, overridden by the AI verdict when we have one. */
  function resultFor(question: Question, value: AnswerValue): QuestionResult {
    const base = gradeQuestion(question, value);
    const ai = aiById[question.id];
    if (!ai) return base;
    return {
      ...base,
      correct: ai.correct,
      earned: ai.correct ? base.points : 0,
      correctAnswer: ai.correctAnswer || base.correctAnswer,
    };
  }

  function finish() {
    const results = questions.map((qq) => resultFor(qq, answers[qq.id]));
    const maxScore = results.reduce((s, r) => s + r.points, 0);
    const score = results.reduce((s, r) => s + r.earned, 0);
    const autoMax = results.filter((r) => r.correct !== null).reduce((s, r) => s + r.points, 0);
    const payload: RunnerSubmitPayload = {
      answers,
      results,
      score,
      maxScore,
      percentage: autoMax ? Math.round((score / autoMax) * 100) : 0,
      needsReview: results.some((r) => r.correct === null),
    };
    setChecked(payload);
    onSubmit?.(payload);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Reveal the answer — open-ended questions are graded by the AI first. */
  async function checkCurrent() {
    if (!q) return;
    const value = answers[q.id];
    if (AI_TYPES.has(q.type) && typeof value === "string" && value.trim()) {
      setAiLoadingId(q.id);
      try {
        const grade = await gradeAnswerWithAI({
          data: {
            prompt: q.prompt,
            studentAnswer: value,
            expectedAnswer: Array.isArray(q.answer) ? q.answer.join(" | ") : (q.answer ?? null),
            kind: q.type === "fill" ? "fill" : "text",
          },
        });
        setAiById((prev) => ({ ...prev, [q.id]: grade }));
      } catch {
        // fall back to local grading if the AI is unreachable
      } finally {
        setAiLoadingId(null);
      }
    }
    setRevealed((r) => ({ ...r, [q.id]: true }));
  }

  useEffect(() => {
    if (secondsLeft === null || checked) return;
    if (secondsLeft <= 0) {
      finish();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, checked]);

  function retry() {
    setAnswers({});
    setRevealed({});
    setAiById({});
    setIndex(0);
    setChecked(null);
    setSecondsLeft(timeLimitMinutes ? timeLimitMinutes * 60 : null);
    setAttemptKey((k) => k + 1);
  }

  function set(id: string, value: AnswerValue) {
    if (isRevealed) return;
    setAnswers((prev) => ({ ...prev, [id]: value }));
    // Single-choice questions check themselves the moment the student taps.
    const current = questions.find((x) => x.id === id);
    if (current && (current.type === "mcq" || current.type === "truefalse")) {
      setRevealed((r) => ({ ...r, [id]: true }));
    }
  }


  const resultById = useMemo(() => {
    const map = new Map<string, QuestionResult>();
    checked?.results.forEach((r) => map.set(r.id, r));
    return map;
  }, [checked]);

  if (!questions.length) {
    return (
      <p className="text-sm text-muted-foreground font-bold text-center py-6">
        No questions in this activity yet
      </p>
    );
  }

  // ---------- Result screen ----------
  if (checked) {
    const graded = {
      score: checked.score,
      maxScore: checked.maxScore,
      percentage: checked.percentage,
      correctCount: checked.results.filter((r) => r.correct === true).length,
      wrongCount: checked.results.filter((r) => r.correct === false).length,
      needsReview: checked.needsReview,
    };

    const passed = graded.percentage >= (passScore ?? 50);
    return (
      <div className="space-y-4" key={attemptKey}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={cn("border-2", passed ? "border-emerald-500/50 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5")}>
            <CardContent className="p-6 space-y-3 text-center">
              <p className="text-sm font-bold text-muted-foreground">Your Score</p>
              <p className="text-4xl font-black">
                {graded.score} / {graded.maxScore}
              </p>
              <p className="text-2xl font-black text-primary">{graded.percentage}%</p>
              <Progress value={graded.percentage} className="h-2.5" />
              <div className="flex justify-center gap-4 text-sm font-bold flex-wrap">
                <span className="text-emerald-600">Correct: {graded.correctCount}</span>
                <span className="text-destructive">Wrong: {graded.wrongCount}</span>
                {graded.needsReview && <span className="text-amber-600">Awaiting teacher review</span>}
              </div>
              {allowRetry && (
                <Button variant="outline" onClick={retry} className="font-bold">
                  <RotateCcw className="h-4 w-4 mr-2" /> Try again
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {questions.map((qq, i) => {
          const res = resultById.get(qq.id);
          return (
            <Card
              key={qq.id}
              className={cn(
                "border-2",
                res?.correct === true && "border-emerald-500/50 bg-emerald-500/[0.06]",
                res?.correct === false && "border-destructive/50 bg-destructive/[0.06]",
                res?.correct === null && "border-amber-500/50 bg-amber-500/[0.06]",
              )}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                    {i + 1}
                  </span>
                  <p className="min-w-0 flex-1 text-[15px] font-bold leading-7 break-words" dir="auto">
                    {qq.prompt}
                  </p>
                  {res?.correct === true && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
                  {res?.correct === false && <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                  {res?.correct === null && <HelpCircle className="h-5 w-5 shrink-0 text-amber-600" />}
                </div>
                {res && (
                  <div className="grid gap-2 sm:grid-cols-2" dir="auto">
                    <div className="rounded-xl border px-3 py-2 text-xs font-bold">
                      <span className="opacity-70">Your answer: </span>
                      {res.yourAnswer}
                    </div>
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700">
                      <span className="opacity-70">Correct answer: </span>
                      {res.correctAnswer}
                    </div>
                  </div>
                )}
                {res && qq.explanation && (
                  <div dir="auto" className="flex gap-2 rounded-xl border border-sky-500/35 bg-sky-500/[0.08] px-3 py-2.5 text-[13px] leading-7">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                    <span className="text-foreground/90">{qq.explanation}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  if (!q) return null;

  // ---------- One question at a time ----------
  const answeredCount = Object.keys(revealed).length;
  const stepResult = isRevealed ? gradeQuestion(q, answers[q.id]) : null;
  const hasAnswer = (() => {
    const v = answers[q.id];
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object") return Object.keys(v).length > 0;
    return v !== undefined && v !== "";
  })();

  return (
    <div className="space-y-4" key={attemptKey} dir="ltr">
      <div className="flex items-center gap-3">
        <Progress value={((index + 1) / total) * 100} className="h-2 flex-1" />
        <span className="shrink-0 text-sm font-black tabular-nums">
          {index + 1} / {total}
        </span>
        {secondsLeft !== null && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black tabular-nums",
              secondsLeft <= 30 ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      <motion.div key={q.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
        <Card
          className={cn(
            "overflow-hidden border-2 shadow-sm",
            !stepResult && "border-border/60",
            stepResult?.correct === true && "border-emerald-500/60 bg-emerald-500/[0.05]",
            stepResult?.correct === false && "border-destructive/60 bg-destructive/[0.05]",
            stepResult?.correct === null && "border-amber-500/60 bg-amber-500/[0.05]",
          )}
        >
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1 text-lg font-black leading-8 break-words" dir="auto">
                {q.prompt}
              </p>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {q.points ?? 1} pt
              </Badge>
            </div>

            <QuestionInput
              q={q}
              value={answers[q.id]}
              onChange={(v) => set(q.id, v)}
              locked={isRevealed}
              revealed={isRevealed}
            />

            {stepResult && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-black",
                  stepResult.correct === true && "border-emerald-500/50 bg-emerald-500/10 text-emerald-700",
                  stepResult.correct === false && "border-destructive/50 bg-destructive/10 text-destructive",
                  stepResult.correct === null && "border-amber-500/50 bg-amber-500/10 text-amber-700",
                )}
              >
                {stepResult.correct === true ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" /> Correct!
                  </>
                ) : stepResult.correct === false ? (
                  <>
                    <XCircle className="h-5 w-5" /> Wrong — correct answer: {stepResult.correctAnswer}
                  </>
                ) : (
                  <>
                    <HelpCircle className="h-5 w-5" /> Saved — your teacher will review it
                  </>
                )}
              </div>
            )}

            {isRevealed && q.explanation && (
              <div dir="auto" className="flex gap-2 rounded-xl border border-sky-500/35 bg-sky-500/[0.08] px-3 py-2.5 text-[13px] leading-7">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <span className="text-foreground/90">{q.explanation}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                className="font-bold"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="flex-1" />
              {!isRevealed ? (
                <Button
                  className="font-black min-w-32"
                  disabled={!hasAnswer}
                  onClick={() => setRevealed((r) => ({ ...r, [q.id]: true }))}
                >
                  Check
                </Button>
              ) : index < total - 1 ? (
                <Button className="font-black min-w-32" onClick={() => setIndex((i) => i + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button className="font-black min-w-32" onClick={finish} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {submitLabel}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
        <span>
          {answeredCount} / {total} answered
        </span>
        {answeredCount > 0 && (
          <button type="button" className="underline" onClick={finish}>
            Finish now
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((qq, i) => {
          const done = !!revealed[qq.id];
          const ok = done ? resultFor(qq, answers[qq.id]).correct : undefined;
          return (
            <button
              key={qq.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "h-7 w-7 rounded-lg text-[11px] font-black transition",
                i === index && "ring-2 ring-primary ring-offset-1",
                ok === true
                  ? "bg-emerald-500/20 text-emerald-700"
                  : ok === false
                    ? "bg-destructive/15 text-destructive"
                    : done
                      ? "bg-amber-500/20 text-amber-700"
                      : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}


function QuestionInput({
  q,
  value,
  onChange,
  locked,
  revealed = false,
}: {
  q: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  locked: boolean;
  revealed?: boolean;
}) {
  const rightOptions = useMemo(
    () => shuffle((q.pairs ?? []).map((p) => p.right)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.id],
  );
  const tokenPool = useMemo(
    () => shuffle(q.tokens ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.id],
  );

  if (q.type === "text") {
    return (
      <Textarea
        dir="auto"
        rows={4}
        disabled={locked}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here..."
      />
    );
  }

  if (q.type === "fill") {
    return (
      <Input
        dir="auto"
        disabled={locked}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type the correct word"
      />
    );
  }

  if (q.type === "order") {
    const chosen = Array.isArray(value) ? value : [];
    const remaining = [...tokenPool];
    chosen.forEach((t) => {
      const idx = remaining.indexOf(t);
      if (idx >= 0) remaining.splice(idx, 1);
    });
    return (
      <div className="space-y-2">
        <div className="min-h-11 rounded-xl border border-dashed p-2 flex flex-wrap gap-2" dir="ltr">
          {chosen.length === 0 && <span className="text-xs text-muted-foreground">Tap the words in order</span>}
          {chosen.map((t, i) => (
            <button
              key={`${t}-${i}`}
              type="button"
              disabled={locked}
              onClick={() => onChange(chosen.filter((_, j) => j !== i))}
              className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-bold"
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" dir="ltr">
          {remaining.map((t, i) => (
            <button
              key={`${t}-pool-${i}`}
              type="button"
              disabled={locked}
              onClick={() => onChange([...chosen, t])}
              className="rounded-lg border px-3 py-1.5 text-sm font-bold hover:bg-muted transition"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "match") {
    const map = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, string>;
    return (
      <div className="space-y-2">
        {(q.pairs ?? []).map((p) => (
          <div key={p.left} className="flex items-center gap-2">
            <span className="flex-1 font-bold text-sm" dir="auto">
              {p.left}
            </span>
            <Select
              disabled={locked}
              value={map[p.left] ?? ""}
              onValueChange={(v) => onChange({ ...map, [p.left]: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {rightOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    );
  }

  const options = q.type === "truefalse" ? ["true", "false"] : (q.options ?? []).filter((o) => o !== "");
  const isMulti = q.type === "multi";
  const selected = isMulti ? (Array.isArray(value) ? value : []) : [];
  const longOptions = options.some((o) => o.length > 38);

  /** Each choice gets its own colour so options never blur together. */
  const OPTION_HUES = [
    { idle: "border-sky-500/35 bg-sky-500/[0.07] hover:bg-sky-500/15", chip: "bg-sky-500/20 text-sky-700", on: "border-sky-500 bg-sky-500/20 text-sky-800" },
    { idle: "border-violet-500/35 bg-violet-500/[0.07] hover:bg-violet-500/15", chip: "bg-violet-500/20 text-violet-700", on: "border-violet-500 bg-violet-500/20 text-violet-800" },
    { idle: "border-amber-500/40 bg-amber-500/[0.09] hover:bg-amber-500/18", chip: "bg-amber-500/25 text-amber-700", on: "border-amber-500 bg-amber-500/20 text-amber-800" },
    { idle: "border-teal-500/35 bg-teal-500/[0.07] hover:bg-teal-500/15", chip: "bg-teal-500/20 text-teal-700", on: "border-teal-500 bg-teal-500/20 text-teal-800" },
    { idle: "border-pink-500/35 bg-pink-500/[0.07] hover:bg-pink-500/15", chip: "bg-pink-500/20 text-pink-700", on: "border-pink-500 bg-pink-500/20 text-pink-800" },
    { idle: "border-indigo-500/35 bg-indigo-500/[0.07] hover:bg-indigo-500/15", chip: "bg-indigo-500/20 text-indigo-700", on: "border-indigo-500 bg-indigo-500/20 text-indigo-800" },
  ];

  return (
    <div className={cn("grid gap-3", longOptions ? "grid-cols-1" : "sm:grid-cols-2")}>

      {options.map((opt, i) => {
        const active = isMulti ? selected.includes(opt) : value === opt;
        const label = q.type === "truefalse" ? (opt === "true" ? "True" : "False") : opt;
        const hue = OPTION_HUES[i % OPTION_HUES.length]!;
        const ans = q.answer;
        const isRight = Array.isArray(ans)
          ? ans.map((a) => String(a).trim().toLowerCase()).includes(opt.trim().toLowerCase())
          : String(ans ?? "").trim().toLowerCase() === opt.trim().toLowerCase();
        return (
          <button
            key={`${opt}-${i}`}
            type="button"
            disabled={locked}
            onClick={() =>
              isMulti
                ? onChange(active ? selected.filter((s) => s !== opt) : [...selected, opt])
                : onChange(opt)
            }
            className={cn(
              "flex items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-start transition text-sm font-bold leading-7",
              !revealed && (active ? hue.on : hue.idle),
              revealed && isRight && "border-emerald-500 bg-emerald-500/15 text-emerald-800",
              revealed && !isRight && active && "border-destructive bg-destructive/10 text-destructive",
              revealed && !isRight && !active && "border-border/50 opacity-55",
              locked && "cursor-not-allowed",
            )}
            dir="auto"
          >
            {q.type !== "truefalse" && (
              <span className={cn("h-7 w-7 shrink-0 rounded-full grid place-items-center text-xs font-black", revealed ? "bg-muted" : hue.chip)}>
                {OPTION_LETTERS[i]}
              </span>
            )}
            <span className="min-w-0 flex-1 break-words">{label}</span>
            {revealed && isRight && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
            {revealed && !isRight && active && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
          </button>
        );
      })}
    </div>
  );

}

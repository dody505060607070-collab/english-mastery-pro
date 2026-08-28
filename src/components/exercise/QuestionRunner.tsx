import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, RotateCcw, Clock, Loader2, HelpCircle, Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  gradeAll,
  OPTION_LETTERS,
  type AnswerValue,
  type Question,
  type QuestionResult,
} from "@/lib/exercise-types";

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
  submitLabel = "Done / Check answers",
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
  const [checked, setChecked] = useState<RunnerSubmitPayload | null>(null);
  const [attemptKey, setAttemptKey] = useState(0);

  const locked = !!checked;
  const answeredCount = questions.filter((q) => {
    const v = answers[q.id];
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object") return Object.keys(v).length > 0;
    return v !== undefined && v !== "";
  }).length;

  function set(id: string, value: AnswerValue) {
    if (locked) return;
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function check() {
    const graded = gradeAll(questions, answers);
    const payload: RunnerSubmitPayload = {
      answers,
      results: graded.results,
      score: graded.score,
      maxScore: graded.maxScore,
      percentage: graded.percentage,
      needsReview: graded.needsReview,
    };
    setChecked(payload);
    onSubmit?.(payload);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function retry() {
    setAnswers({});
    setChecked(null);
    setAttemptKey((k) => k + 1);
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

  const graded = checked ? gradeAll(questions, checked.answers) : null;

  return (
    <div className="space-y-4" key={attemptKey}>
      {checked && graded && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            className={cn(
              "border-2",
              graded.percentage >= (passScore ?? 50) ? "border-emerald-500/50 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5",
            )}
          >
            <CardContent className="p-5 space-y-3 text-center">
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
                  <RotateCcw className="h-4 w-4 ml-2" /> Retry
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!checked && (
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>
            {answeredCount} / {questions.length} answered
          </span>
          {timeLimitMinutes ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {timeLimitMinutes} minutes
            </span>
          ) : null}
        </div>
      )}

      {questions.map((q, i) => {
        const res = resultById.get(q.id);
        return (
          <Card
            key={q.id}
            className={cn(
              "overflow-hidden border-2 transition",
              res === undefined && "border-border/60",
              res?.correct === true && "border-emerald-500/50 bg-emerald-500/[0.06]",
              res?.correct === false && "border-destructive/50 bg-destructive/[0.06]",
              res?.correct === null && "border-amber-500/50 bg-amber-500/[0.06]",
            )}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-black",
                    res?.correct === true
                      ? "bg-emerald-500/15 text-emerald-600"
                      : res?.correct === false
                        ? "bg-destructive/15 text-destructive"
                        : res?.correct === null
                          ? "bg-amber-500/15 text-amber-600"
                          : "bg-primary/10 text-primary",
                  )}
                >
                  {i + 1}
                </span>
                <p className="flex-1 text-[15px] font-bold leading-7" dir="auto">
                  {q.prompt}
                </p>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {q.points ?? 1} pt
                </Badge>
                {res?.correct === true && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
                {res?.correct === false && <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                {res?.correct === null && <HelpCircle className="h-5 w-5 shrink-0 text-amber-600" />}
              </div>

              <QuestionInput
                q={q}
                value={answers[q.id]}
                onChange={(v) => set(q.id, v)}
                locked={locked}
                revealed={!!res}
              />

              {res && (
                <div className="grid gap-2 sm:grid-cols-2" dir="auto">
                  <div
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-bold",
                      res.correct === true
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                        : res.correct === false
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-700",
                    )}
                  >
                    <span className="opacity-70">Your answer: </span>
                    {res.yourAnswer}
                  </div>
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700">
                    <span className="opacity-70">Correct answer: </span>
                    {res.correctAnswer}
                  </div>
                </div>
              )}

              {res && q.explanation && (
                <div
                  dir="auto"
                  className="flex gap-2 rounded-xl border border-sky-500/35 bg-sky-500/[0.08] px-3 py-2.5 text-[13px] leading-7"
                >
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span className="text-foreground/90">{q.explanation}</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!checked && (
        <Button className="w-full font-black h-12 text-base" onClick={check} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          {submitLabel}
        </Button>
      )}
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

  return (
    <div className={cn("grid gap-2", longOptions ? "grid-cols-1" : "sm:grid-cols-2")}>

      {options.map((opt, i) => {
        const active = isMulti ? selected.includes(opt) : value === opt;
        const label = q.type === "truefalse" ? (opt === "true" ? "True" : "False") : opt;
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
              "flex items-center gap-2 rounded-xl border-2 p-3 text-start transition text-sm font-bold",
              !revealed && (active ? "border-primary bg-primary/10 text-primary" : "border-border/70 hover:bg-muted/60"),
              revealed && isRight && "border-emerald-500/60 bg-emerald-500/10 text-emerald-700",
              revealed && !isRight && active && "border-destructive/60 bg-destructive/10 text-destructive",
              revealed && !isRight && !active && "border-border/50 opacity-60",
              locked && "cursor-not-allowed",
            )}
            dir="auto"
          >
            {q.type !== "truefalse" && (
              <span className="h-6 w-6 shrink-0 rounded-full bg-muted grid place-items-center text-xs font-black">
                {OPTION_LETTERS[i]}
              </span>
            )}
            <span className="flex-1">{label}</span>
            {revealed && isRight && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
            {revealed && !isRight && active && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
          </button>
        );
      })}
    </div>
  );
}

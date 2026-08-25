import { Plus, Trash2, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  newQuestion,
  OPTION_LETTERS,
  QUESTION_TYPE_LABELS,
  type Question,
  type QuestionType,
} from "@/lib/exercise-types";

/** Admin builder for the question bank stored inside unit_contents.data.questions */
export function QuestionEditor({
  questions,
  onChange,
}: {
  questions: Question[];
  onChange: (q: Question[]) => void;
}) {
  const update = (i: number, patch: Partial<Question>) =>
    onChange(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="font-black">Questions ({questions.length})</Label>
        <Select onValueChange={(v) => onChange([...questions, newQuestion(v as QuestionType)])}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="+ Add question" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(QUESTION_TYPE_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {questions.map((q, i) => (
        <Card key={q.id} className="border-border/70">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary">{i + 1}</Badge>
              <Badge variant="outline" className="text-[10px]">
                {QUESTION_TYPE_LABELS[q.type]}
              </Badge>
              <div className="flex-1" />
              <Input
                type="number"
                className="w-20 h-8"
                value={q.points ?? 1}
                onChange={(e) => update(i, { points: Number(e.target.value) || 1 })}
                title="Points"
              />
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={i === 0}
                  onClick={() => {
                    const next = [...questions];
                    const prev = next[i - 1]!;
                    next[i - 1] = next[i]!;
                    next[i] = prev;
                    onChange(next);
                  }}
                >
                  ↑
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => onChange(questions.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Textarea
              dir="auto"
              rows={2}
              placeholder="Question text"
              value={q.prompt}
              onChange={(e) => update(i, { prompt: e.target.value })}
            />

            {(q.type === "mcq" || q.type === "multi") && (
              <div className="space-y-2">
                {(q.options ?? []).map((opt, oi) => {
                  const selected =
                    q.type === "mcq"
                      ? q.answer === opt && opt !== ""
                      : Array.isArray(q.answer) && q.answer.includes(opt) && opt !== "";
                  return (
                    <div key={oi} className="flex items-center gap-2">
                      <span className="h-7 w-7 grid place-items-center rounded-full bg-muted text-xs font-black">
                        {OPTION_LETTERS[oi]}
                      </span>
                      <Input
                        dir="auto"
                        value={opt}
                        onChange={(e) => {
                          const options = [...(q.options ?? [])];
                          const old = options[oi];
                          options[oi] = e.target.value;
                          const patch: Partial<Question> = { options };
                          if (q.type === "mcq" && q.answer === old) patch.answer = e.target.value;
                          if (q.type === "multi" && Array.isArray(q.answer))
                            patch.answer = q.answer.map((a) => (a === old ? e.target.value : a));
                          update(i, patch);
                        }}
                        placeholder={`Option ${OPTION_LETTERS[oi]}`}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        className="font-bold shrink-0"
                        onClick={() => {
                          if (!opt) return;
                          if (q.type === "mcq") update(i, { answer: opt });
                          else {
                            const cur = Array.isArray(q.answer) ? q.answer : [];
                            update(i, {
                              answer: cur.includes(opt) ? cur.filter((a) => a !== opt) : [...cur, opt],
                            });
                          }
                        }}
                      >
                        Correct
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={() => update(i, { options: (q.options ?? []).filter((_, j) => j !== oi) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => update(i, { options: [...(q.options ?? []), ""] })}
                >
                  <Plus className="h-4 w-4 ml-1" /> Option
                </Button>
              </div>
            )}

            {q.type === "truefalse" && (
              <Select value={String(q.answer ?? "true")} onValueChange={(v) => update(i, { answer: v })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            )}

            {q.type === "fill" && (
              <Input
                dir="auto"
                placeholder="Correct answer (separate alternatives with |)"
                value={typeof q.answer === "string" ? q.answer : ""}
                onChange={(e) => update(i, { answer: e.target.value })}
              />
            )}

            {q.type === "order" && (
              <div className="space-y-2">
                <Input
                  dir="ltr"
                  placeholder="Correct sentence (words separated by space)"
                  value={Array.isArray(q.answer) ? q.answer.join(" ") : ""}
                  onChange={(e) => {
                    const tokens = e.target.value.split(/\s+/).filter(Boolean);
                    update(i, { answer: tokens, tokens });
                  }}
                />
                <p className="text-[11px] text-muted-foreground">Words will be shuffled automatically for the student.</p>
              </div>
            )}

            {q.type === "match" && (
              <div className="space-y-2">
                {(q.pairs ?? []).map((p, pi) => (
                  <div key={pi} className="flex items-center gap-2">
                    <Input
                      dir="auto"
                      placeholder="Right column"
                      value={p.left}
                      onChange={(e) => {
                        const pairs = [...(q.pairs ?? [])];
                        pairs[pi] = { ...p, left: e.target.value };
                        update(i, { pairs });
                      }}
                    />
                    <span>↔</span>
                    <Input
                      dir="auto"
                      placeholder="Matching item"
                      value={p.right}
                      onChange={(e) => {
                        const pairs = [...(q.pairs ?? [])];
                        pairs[pi] = { ...p, right: e.target.value };
                        update(i, { pairs });
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => update(i, { pairs: (q.pairs ?? []).filter((_, j) => j !== pi) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => update(i, { pairs: [...(q.pairs ?? []), { left: "", right: "" }] })}
                >
                  <Plus className="h-4 w-4 ml-1" /> Pair
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

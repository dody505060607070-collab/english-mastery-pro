import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Clock,
  Loader2,
  Eye,
  EyeOff,
  Trophy,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Progress } from "@/components/ui/progress";
import { InteractiveText } from "@/components/InteractiveText";
import { GrammarLesson, parseGrammar } from "@/components/GrammarLesson";
import { MediaBlock } from "@/components/MediaBlock";
import { AudioPlayer } from "@/components/AudioPlayer";
import { QuestionRunner, type RunnerSubmitPayload } from "@/components/exercise/QuestionRunner";
import { VocabularyDeck } from "@/components/exercise/VocabularyDeck";
import { buildAutoQuestions, stripAnswers } from "@/lib/auto-questions";
import { getUnitDetail, setContentProgress, submitExercise, setVocabLearned } from "@/lib/curriculum.functions";
import { contentMeta, contentColor } from "@/lib/content-types";
import type { ExerciseData, Question, VocabWord } from "@/lib/exercise-types";
import { useMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/learn/$unitId")({
  component: UnitPage,
});

type ContentRow = {
  id: string;
  title: string;
  content_type: string;
  body: string | null;
  media_url: string | null;
  data?: unknown;
};

const TYPE_ORDER = ["vocabulary", "reading", "listening", "speaking", "grammar", "pronunciation", "practice", "task", "tasks", "test"];

const TYPE_INFO: Record<string, { desc: string; min: number }> = {
  reading: { desc: "Text, glossary and comprehension questions", min: 12 },
  speaking: { desc: "Discussion questions and a mini talk", min: 10 },
  pronunciation: { desc: "Sound focus, drills and practice questions", min: 8 },
  tasks: { desc: "Productive writing and speaking output", min: 20 },
  listening: { desc: "Audio, transcript and listening tasks", min: 8 },
  grammar: { desc: "Explanation, form, mistakes and drills", min: 12 },
  vocabulary: { desc: "Word cards, pronunciation and collocations", min: 10 },
  practice: { desc: "Mixed skills consolidation quiz", min: 12 },
  task: { desc: "Productive writing and speaking output", min: 20 },
  test: { desc: "End of unit assessment", min: 15 },
};

function orderRank(t: string) {
  const i = TYPE_ORDER.indexOf(t);
  return i === -1 ? TYPE_ORDER.length : i;
}

function parseData(raw: unknown): ExerciseData {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ExerciseData;
    } catch {
      return {};
    }
  }
  return raw as ExerciseData;
}

function UnitPage() {
  const { unitId } = useParams({ from: "/_authenticated/learn/$unitId" });
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["unit-detail", unitId],
    queryFn: () => getUnitDetail({ data: { unitId } }),
    retry: false,
  });

  const contents = useMemo(
    () =>
      [...((data?.contents ?? []) as ContentRow[])].sort(
        (a, b) => orderRank(a.content_type) - orderRank(b.content_type),
      ),
    [data],
  );


  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["unit-detail", unitId] });
    qc.invalidateQueries({ queryKey: ["my-curriculum"] });
  };

  const toggle = useMutation({
    mutationFn: (v: { contentId: string; completed: boolean }) =>
      setContentProgress({ data: { contentId: v.contentId, unitId, completed: v.completed } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = useMutation({
    mutationFn: (v: { contentId: string; payload: RunnerSubmitPayload }) =>
      submitExercise({
        data: {
          contentId: v.contentId,
          unitId,
          answers: v.payload.answers,
        },
      }),
    onSuccess: () => {
      toast.success("Your result has been recorded");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const vocab = useMutation({
    mutationFn: (v: { contentId: string; word: string; learned: boolean }) =>
      setVocabLearned({ data: { contentId: v.contentId, unitId, word: v.word, learned: v.learned } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const done = useMemo(() => new Set(data?.completedIds ?? []), [data]);
  const activeIndex = contents.findIndex((c) => c.id === activeId);
  const active = activeIndex >= 0 ? contents[activeIndex] : undefined;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-6" dir="ltr">
        <h1 className="text-xl font-black">Could not open this unit</h1>
        <p className="text-muted-foreground">{(error as Error)?.message}</p>
        <Button asChild>
          <Link to="/learn">My Units</Link>
        </Button>
      </div>
    );
  }

  const progress = contents.length
    ? Math.round((contents.filter((c) => done.has(c.id)).length / contents.length) * 100)
    : 0;

  const learnedWords = ((data as any).learnedWords ?? []) as { content_id: string; word: string }[];
  const attempts = ((data as any).attempts ?? []) as {
    content_id: string;
    percentage: number;
  }[];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-5 font-['Outfit']" dir="ltr">
      <Button variant="ghost" size="sm" asChild className="font-bold">
        <Link to="/learn">
          <ArrowRight className="h-4 w-4 ml-1" />
          My Units
        </Link>
      </Button>

      <Card className="bg-gradient-to-l from-primary/20 to-transparent border-primary/30">
        <CardContent className="p-6 space-y-3">
          <p className="text-xs font-bold text-primary">{(data.unit as any).sections?.name}</p>
          <h1 className="text-2xl font-black">{data.unit.title}</h1>
          {data.unit.description && <p className="text-sm text-muted-foreground">{data.unit.description}</p>}
          <Progress value={progress} className="h-2.5" />
          <p className="text-xs font-bold text-muted-foreground">{progress}% Completed</p>
        </CardContent>
      </Card>

      {contents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center font-bold text-muted-foreground">
            No content has been published in this unit yet
          </CardContent>
        </Card>
      ) : !active ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" dir="ltr">
          {contents.map((c) => {
            const meta = contentMeta(c.content_type);
            const color = contentColor(c.content_type);
            const info = TYPE_INFO[c.content_type] ?? { desc: meta.label, min: 10 };
            const isDone = done.has(c.id);
            const cData = parseData(c.data);
            const count = (cData.questions?.length ?? 0) + (cData.words?.length ?? 0);
            const best = attempts.filter((a) => a.content_id === c.id).map((a) => a.percentage);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "group relative overflow-hidden text-left rounded-2xl border bg-card p-5 transition-all hover:shadow-xl hover:-translate-y-1",
                  isDone ? "border-emerald-500/50" : "border-border/60 hover:border-primary/40",
                )}
              >
                <span className={cn("absolute inset-x-0 top-0 h-1", color.bar)} />
                <div className="flex items-start justify-between gap-2">
                  <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", color.tile)}>
                    <meta.icon className="h-6 w-6" />
                  </div>
                  {isDone && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-600">
                      <Trophy className="h-3 w-3" /> Done
                    </span>
                  )}
                </div>
                <p className="mt-3 font-black text-lg">{meta.label}</p>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{info.desc}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
                    <Clock className="h-3 w-3" /> {info.min} min
                  </span>
                  {count > 0 && (
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1", color.soft)}>
                      {count} {c.content_type === "vocabulary" ? "words" : "activities"}
                    </span>
                  )}
                  {best.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-600">
                      {Math.max(...best)}%
                    </span>
                  )}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-primary">
                  Start <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </span>
              </button>
            );
          })}
        </div>

      ) : (
        <div className="space-y-4">
          <div className="sticky top-0 z-20 -mx-4 border-b bg-background/85 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Button variant="ghost" size="sm" className="shrink-0 font-bold" onClick={() => setActiveId(null)}>
                <ArrowRight className="h-4 w-4 ml-1" /> All
              </Button>
              {contents.map((c, i) => {
                const m = contentMeta(c.content_type);
                const cc = contentColor(c.content_type);
                const isActive = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition",
                      isActive ? cn("border-transparent", cc.tile) : "border-border/60 text-muted-foreground hover:bg-muted",
                      done.has(c.id) && !isActive && "border-emerald-500/40 text-emerald-600",
                    )}
                  >
                    <m.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{m.label}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-4">
            {active && (
              <ContentPanel
                key={active.id}
                content={active}
                learnedWords={learnedWords.filter((w) => w.content_id === active.id).map((w) => w.word)}
                isDone={done.has(active.id)}
                onSubmitExercise={(payload) => submit.mutate({ contentId: active.id, payload })}
                onToggleWord={(word, learned) => vocab.mutate({ contentId: active.id, word, learned })}
                onToggleDone={() => toggle.mutate({ contentId: active.id, completed: !done.has(active.id) })}
                busy={toggle.isPending || submit.isPending}
              />
            )}

            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                className="font-bold"
                disabled={activeIndex <= 0}
                onClick={() => setActiveId(contents[activeIndex - 1]!.id)}
              >
                <ArrowRight className="h-4 w-4 ml-1" /> Previous
              </Button>
              <Button
                className="font-bold"
                disabled={activeIndex >= contents.length - 1}
                onClick={() => setActiveId(contents[activeIndex + 1]!.id)}
              >
                Next <ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </div>
        </div>

      )}
    </div>
  );
}

/** Removes "Key words" / glossary table sections from reading passages (redundant with Vocabulary). */
function stripKeyWordsSection(body: string): string {
  return body
    .split(/\n(?=#{1,4}\s)/)
    .filter((chunk) => !/^#{1,4}\s*(key\s*words?|keywords?|glossary|كلمات)/i.test(chunk.trim()))
    .join("\n");
}

function ContentPanel({
  content,
  learnedWords,
  isDone,
  onSubmitExercise,
  onToggleWord,
  onToggleDone,
  busy,
}: {
  content: ContentRow;
  learnedWords: string[];
  isDone: boolean;
  onSubmitExercise: (payload: RunnerSubmitPayload) => void;
  onToggleWord: (word: string, learned: boolean) => void;
  onToggleDone: () => void;
  busy: boolean;
}) {
  const meta = contentMeta(content.content_type);
  const data = parseData(content.data);
  const words = (data.words ?? []) as VocabWord[];
  const stored = (data.questions ?? []) as Question[];
  const questions = useMemo(
    () => (stored.length ? stored : buildAutoQuestions(content.content_type, content.body, words)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content.id],
  );
  const lessonBody = useMemo(() => {
    const body = stripAnswers(content.body);
    if (content.content_type !== "reading") return body;
    return stripKeyWordsSection(body);
  }, [content.id, content.body, content.content_type]);
  const [showTranscript, setShowTranscript] = useState(false);
  const image = useMediaUrl(data.image_url ?? null);

  const isListening = content.content_type === "listening";
  const isVocab = content.content_type === "vocabulary";

  const color = contentColor(content.content_type);

  return (
    <Card className="overflow-hidden">
      <div className={cn("h-1.5 w-full", color.bar)} />
      <CardContent className="p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", color.tile)}>
            <meta.icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-lg leading-6 break-words">{content.title}</h2>
            <span className={cn("mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-black", color.soft)}>
              {meta.label}
            </span>
          </div>
          {isDone && <Trophy className="h-5 w-5 text-amber-500" />}
        </div>


        {image && (
          <img
            src={image}
            alt=""
            className="max-h-64 w-full rounded-2xl border object-cover"
            loading="lazy"
          />
        )}

        {isListening ? (
          <div className="space-y-3">
            <AudioPlayer
              path={content.media_url}
              text={data.transcript ?? lessonBody ?? null}
              maxPlays={data.max_plays ?? null}
            />
            {(data.transcript || lessonBody) && (
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="font-bold" onClick={() => setShowTranscript((v) => !v)}>
                  {showTranscript ? <EyeOff className="h-4 w-4 ml-1" /> : <Eye className="h-4 w-4 ml-1" />}
                  {showTranscript ? "Hide Text" : "Show Text (Transcript)"}
                </Button>
                {showTranscript && (
                  <div className="rounded-2xl bg-muted/40 p-3">
                    <InteractiveText
                      text={(data.transcript ?? lessonBody ?? "") as string}
                      className="text-sm text-foreground/90"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {lessonBody && (
              <div className="space-y-3">
                <AudioPlayer text={lessonBody} />
                {content.content_type === "grammar" || parseGrammar(lessonBody).length > 1 ? (
                  <>
                    <GrammarLesson body={lessonBody} />
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Tap a word to hear it · double-tap to save it
                    </p>
                  </>
                ) : (
                  <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.14] to-transparent p-4">
                    <InteractiveText text={lessonBody} className="text-[15px] text-foreground/90 leading-8" />
                    <p className="mt-2 text-[11px] font-bold text-muted-foreground">
                      Tap a word to hear it · double-tap to save it
                    </p>
                  </div>
                )}

              </div>
            )}

            {content.media_url && <MediaBlock path={content.media_url} kind={content.content_type} />}
          </>
        )}

        {isVocab && words.length > 0 && (
          <VocabularyDeck words={words} learned={learnedWords} onToggle={onToggleWord} />
        )}

        {questions.length > 0 && (
          <QuestionRunner
            questions={questions}
            onSubmit={onSubmitExercise}
            submitting={busy}
            timeLimitMinutes={data.time_limit_minutes ?? null}
            passScore={data.pass_score ?? null}
          />
        )}

        {questions.length === 0 && (
          <Button
            variant={isDone ? "outline" : "default"}
            className="w-full font-black"
            onClick={onToggleDone}
            disabled={busy}
          >
            {isDone ? "Completed" : "Mark as Completed"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

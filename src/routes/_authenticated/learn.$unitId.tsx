import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Eye,
  EyeOff,
  Trophy,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InteractiveText } from "@/components/InteractiveText";
import { MediaBlock } from "@/components/MediaBlock";
import { AudioPlayer } from "@/components/AudioPlayer";
import { QuestionRunner, type RunnerSubmitPayload } from "@/components/exercise/QuestionRunner";
import { VocabularyDeck } from "@/components/exercise/VocabularyDeck";
import { getUnitDetail, setContentProgress, submitExercise, setVocabLearned } from "@/lib/curriculum.functions";
import { contentMeta } from "@/lib/content-types";
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

const TYPE_ORDER = ["reading", "listening", "grammar", "vocabulary", "practice", "task", "test"];

const TYPE_INFO: Record<string, { desc: string; min: number }> = {
  reading: { desc: "Text, glossary and comprehension questions", min: 12 },
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

  const contents = (data?.contents ?? []) as ContentRow[];

  useEffect(() => {
    if (!activeId && contents.length) setActiveId(contents[0]!.id);
  }, [contents, activeId]);

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
      toast.success("تم تسجيل نتيجتك");
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-6" dir="rtl">
        <h1 className="text-xl font-black">تعذر فتح هذه الوحدة</h1>
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
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-5 font-['Cairo']" dir="rtl">
      <Button variant="ghost" size="sm" asChild className="font-bold">
        <Link to="/learn">
          <ArrowRight className="h-4 w-4 ml-1" />
          My Units
        </Link>
      </Button>

      <Card className="bg-gradient-to-l from-primary/10 to-transparent border-primary/20">
        <CardContent className="p-6 space-y-3">
          <p className="text-xs font-bold text-primary">{(data.unit as any).sections?.name}</p>
          <h1 className="text-2xl font-black">{data.unit.title}</h1>
          {data.unit.description && <p className="text-sm text-muted-foreground">{data.unit.description}</p>}
          <Progress value={progress} className="h-2.5" />
          <p className="text-xs font-bold text-muted-foreground">{progress}% مكتمل</p>
        </CardContent>
      </Card>

      {contents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center font-bold text-muted-foreground">
            لا يوجد محتوى منشور في هذه الوحدة بعد
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
            {contents.map((c, i) => {
              const meta = contentMeta(c.content_type);
              const isDone = done.has(c.id);
              const best = attempts.filter((a) => a.content_id === c.id).map((a) => a.percentage);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-2xl border p-3 text-right transition",
                    c.id === activeId ? "border-primary bg-primary/10" : "hover:bg-muted/60",
                    isDone && c.id !== activeId && "border-emerald-500/40",
                  )}
                >
                  <div className="bg-primary/10 text-primary p-2 rounded-xl shrink-0">
                    <meta.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{c.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {i + 1}. {meta.label}
                      {best.length ? ` • ${Math.max(...best)}%` : ""}
                    </p>
                  </div>
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              );
            })}
          </aside>

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
                <ArrowRight className="h-4 w-4 ml-1" /> السابق
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
  const questions = (data.questions ?? []) as Question[];
  const words = (data.words ?? []) as VocabWord[];
  const [showTranscript, setShowTranscript] = useState(false);
  const image = useMediaUrl(data.image_url ?? null);

  const isListening = content.content_type === "listening";
  const isVocab = content.content_type === "vocabulary";

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2.5 rounded-2xl">
            <meta.icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-lg truncate">{content.title}</h2>
            <Badge variant="secondary" className="text-[10px] mt-1">
              {meta.label}
            </Badge>
          </div>
          {isDone && <Trophy className="h-5 w-5 text-amber-500" />}
        </div>

        {image && <img src={image} alt="" className="w-full rounded-2xl border object-cover" loading="lazy" />}

        {isListening ? (
          <div className="space-y-3">
            <AudioPlayer
              path={content.media_url}
              text={data.transcript ?? content.body ?? null}
              maxPlays={data.max_plays ?? null}
            />
            {(data.transcript || content.body) && (
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="font-bold" onClick={() => setShowTranscript((v) => !v)}>
                  {showTranscript ? <EyeOff className="h-4 w-4 ml-1" /> : <Eye className="h-4 w-4 ml-1" />}
                  {showTranscript ? "إخفاء النص" : "إظهار النص (Transcript)"}
                </Button>
                {showTranscript && (
                  <div className="rounded-2xl bg-muted/40 p-3">
                    <InteractiveText
                      text={(data.transcript ?? content.body ?? "") as string}
                      className="text-sm text-foreground/90"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {content.body && (
              <div className="space-y-3">
                <AudioPlayer text={content.body} />
                <div className="rounded-2xl bg-muted/40 p-3">
                  <InteractiveText text={content.body} className="text-sm text-foreground/90 leading-8" />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    اضغط على أي كلمة إنجليزية لسماع نطقها، أو اضغط مرتين لمعرفة معناها وإضافتها لقاموسك.
                  </p>
                </div>
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
            {isDone ? "إلغاء الإكمال" : "تحديد كمكتمل"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

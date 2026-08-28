import { useState } from "react";
import { Check, Volume2, Languages, Loader2, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { primeAudio, playText, playUrl, useAudioState } from "@/lib/audio";
import { useMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { SaveWordBookmark } from "@/components/SaveWordBookmark";
import { HIGHLIGHT_CLASSES, useHighlight } from "@/lib/highlights";

import type { VocabWord } from "@/lib/exercise-types";

export function VocabularyDeck({
  words,
  learned,
  onToggle,
}: {
  words: VocabWord[];
  learned: string[];
  onToggle?: (word: string, isLearned: boolean) => void;
}) {
  const learnedSet = new Set(learned.map((w) => w.toLowerCase()));
  const progress = words.length
    ? Math.round((words.filter((w) => learnedSet.has(w.word.toLowerCase())).length / words.length) * 100)
    : 0;

  if (!words.length) {
    return <p className="py-6 text-center text-sm font-bold text-muted-foreground">No words yet</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-bold">
          <span>Mastered words</span>
          <span className="text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {words.map((w) => (
          <WordCard key={w.word} word={w} isLearned={learnedSet.has(w.word.toLowerCase())} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

/** Bolds the target word inside the example sentence, like a printed glossary. */
function Example({ text, word }: { text: string; word: string }) {
  const stem = word.replace(/[^A-Za-z]/g, "");
  if (!stem) return <>{text}</>;
  const parts = text.split(new RegExp(`(${stem}\\w*)`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase().startsWith(stem.toLowerCase()) ? (
          <strong key={i} className="rounded bg-primary/15 px-0.5 font-bold text-foreground">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function WordCard({
  word,
  isLearned,
  onToggle,
}: {
  word: VocabWord;
  isLearned: boolean;
  onToggle?: ((word: string, isLearned: boolean) => void) | undefined;
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const img = useMediaUrl(word.image_url);
  const wordAudio = useMediaUrl(word.word_audio);
  const sentenceAudio = useMediaUrl(word.sentence_audio);
  const audio = useAudioState();
  const highlight = useHighlight(word.word);

  const wordOwner = `vocab-word:${word.word}`;
  const sentenceOwner = `vocab-sentence:${word.word}`;

  function play(owner: string, url: string | null, fallbackText?: string) {
    primeAudio();
    if (url) {
      void playUrl(url, owner).catch(() => {
        if (fallbackText) void playText(fallbackText, owner);
      });
    } else if (fallbackText) {
      void playText(fallbackText, owner);
    }
  }

  const busy = (owner: string) => audio.owner === owner && audio.status === "loading";
  const active = (owner: string) => audio.owner === owner && audio.status === "playing";

  return (
    <article
      dir="ltr"
      className={cn(
        "relative flex h-full flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        isLearned && "border-emerald-500/40",
      )}
    >
      {/* mastered toggle, top-right */}
      <button
        type="button"
        onClick={() => onToggle?.(word.word, !isLearned)}
        aria-label={isLearned ? `${word.word} mastered` : `Mark ${word.word} as learned`}
        title={isLearned ? "Mastered" : "Mark as learned"}
        className={cn(
          "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border transition",
          isLearned
            ? "border-emerald-500 bg-emerald-500 text-primary-foreground"
            : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
        )}
      >
        <Check className="h-4 w-4" />
      </button>

      <div className="h-10 w-10 overflow-hidden rounded-xl border border-border/70 bg-muted/60">
        {img ? (
          <img src={img} alt={word.word} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="grid h-full w-full place-items-center text-sm font-black text-muted-foreground">
            {word.word.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h4
          className={cn(
            "font-serif text-2xl font-bold leading-tight tracking-tight",
            highlight && HIGHLIGHT_CLASSES[highlight],
          )}
        >
          {word.word}
        </h4>
        {word.phonetic && <p className="text-sm font-medium text-primary">/{word.phonetic.replace(/^\/|\/$/g, "")}/</p>}
        {word.category && (
          <p className="flex items-center gap-1.5 pt-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            <Tag className="h-3 w-3" />
            {word.category}
          </p>
        )}
      </div>

      {word.example && (
        <p className="text-sm leading-7 text-foreground/85">
          <Example text={word.example} word={word.word} />
        </p>
      )}

      {showTranslation && (
        <div dir="rtl" className="space-y-1 rounded-xl bg-muted/50 px-3 py-2 text-right">
          {word.translation && <p className="text-xs font-bold text-primary">{word.translation}</p>}
          {word.example_ar && <p className="text-[11px] leading-6 text-muted-foreground">{word.example_ar}</p>}
          {!word.translation && !word.example_ar && (
            <p className="text-[11px] text-muted-foreground">لا توجد ترجمة متاحة</p>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/20"
          onClick={() => setShowTranslation((v) => !v)}
        >
          <Languages className="mr-1 h-3.5 w-3.5" />
          Translate
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className={cn("h-8 rounded-lg px-3 text-xs font-bold", active(wordOwner) && "bg-primary/20 text-primary")}
          onClick={() => play(wordOwner, wordAudio, word.word)}
          aria-label={`Listen to ${word.word}`}
        >
          {busy(wordOwner) ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Volume2 className="mr-1 h-3.5 w-3.5" />
          )}
          Listen
        </Button>
        {word.example && (
          <Button
            size="sm"
            variant="ghost"
            className={cn("h-8 rounded-lg px-2 text-xs font-bold", active(sentenceOwner) && "text-primary")}
            onClick={() => play(sentenceOwner, sentenceAudio, word.example ?? undefined)}
            aria-label="Listen to the example sentence"
          >
            {busy(sentenceOwner) ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        <SaveWordBookmark
          word={word.word}
          translation={word.translation ?? null}
          phonetic={word.phonetic ?? null}
          example={word.example ?? null}
          example_ar={word.example_ar ?? null}
          className="ml-auto h-8 w-8 border-transparent bg-transparent"
        />
      </div>
    </article>
  );
}

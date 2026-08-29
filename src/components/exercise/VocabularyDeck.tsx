import { useState } from "react";
import { Check, Volume2, Languages, Loader2, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { primeAudio, playText, playUrl, useAudioState } from "@/lib/audio";
import { useMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { SaveWordBookmark } from "@/components/SaveWordBookmark";
import { HIGHLIGHT_CLASSES, useHighlight } from "@/lib/highlights";
import { wordEmoji } from "@/lib/word-emoji";

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

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {words.map((w) => (
          <WordCard key={w.word} word={w} isLearned={learnedSet.has(w.word.toLowerCase())} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

/** Keeps only the short sentence/clause that actually contains the word. */
export function shortenExample(text: string, word: string, maxWords = 8) {
  const stem = word.replace(/[^A-Za-z]/g, "").toLowerCase();
  const sentences = text.split(/(?<=[.!?])\s+|,\s+/).filter(Boolean);
  let pick = sentences.find((s) => s.toLowerCase().includes(stem)) ?? sentences[0] ?? text;
  const words = pick.trim().split(/\s+/);
  if (words.length > maxWords) {
    const at = Math.max(0, words.findIndex((w) => w.toLowerCase().includes(stem)));
    const start = Math.max(0, Math.min(at - 3, words.length - maxWords));
    pick = (start > 0 ? "… " : "") + words.slice(start, start + maxWords).join(" ");
    if (start + maxWords < words.length) pick = pick.replace(/[,;:]?$/, "") + " …";
  }
  return pick.trim();
}

/** Bolds the target word inside the example sentence, like a printed glossary. */
function Example({ text, word }: { text: string; word: string }) {
  const stem = word.replace(/[^A-Za-z]/g, "");
  if (!stem) return <>{shortenExample(text, word)}</>;
  const parts = shortenExample(text, word).split(new RegExp(`(${stem}\\w*)`, "gi"));
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

export function WordCard({
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

  /** Stable per-word colour so the deck reads as a colourful set of cards. */
  const CARD_HUES = [
    { ring: "border-sky-500/40", top: "bg-sky-500", chip: "bg-sky-500/15 text-sky-700 border-sky-500/30", tint: "bg-sky-500/[0.05]" },
    { ring: "border-violet-500/40", top: "bg-violet-500", chip: "bg-violet-500/15 text-violet-700 border-violet-500/30", tint: "bg-violet-500/[0.05]" },
    { ring: "border-amber-500/45", top: "bg-amber-500", chip: "bg-amber-500/18 text-amber-700 border-amber-500/30", tint: "bg-amber-500/[0.06]" },
    { ring: "border-emerald-500/40", top: "bg-emerald-500", chip: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", tint: "bg-emerald-500/[0.05]" },
    { ring: "border-pink-500/40", top: "bg-pink-500", chip: "bg-pink-500/15 text-pink-700 border-pink-500/30", tint: "bg-pink-500/[0.05]" },
    { ring: "border-teal-500/40", top: "bg-teal-500", chip: "bg-teal-500/15 text-teal-700 border-teal-500/30", tint: "bg-teal-500/[0.05]" },
    { ring: "border-indigo-500/40", top: "bg-indigo-500", chip: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30", tint: "bg-indigo-500/[0.05]" },
  ];
  const hue = CARD_HUES[
    Array.from(word.word).reduce((a, c) => a + c.charCodeAt(0), 0) % CARD_HUES.length
  ]!;

  return (
    <article
      dir="ltr"
      className={cn(
        "relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border-2 bg-card p-5 pt-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        hue.ring,
        hue.tint,
        isLearned && "border-emerald-500/60",
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-1.5", hue.top)} />
      {/* mastered toggle, top-right */}
      <button
        type="button"
        onClick={() => onToggle?.(word.word, !isLearned)}
        aria-label={isLearned ? `${word.word} mastered` : `Mark ${word.word} as learned`}
        title={isLearned ? "Mastered" : "Mark as learned"}
        className={cn(
          "absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-full border transition",
          isLearned
            ? "border-emerald-500 bg-emerald-500 text-primary-foreground"
            : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
        )}
      >
        <Check className="h-4 w-4" />
      </button>

      <div className={cn("h-12 w-12 overflow-hidden rounded-xl border-2", hue.ring)}>
        {img ? (
          <img src={img} alt={word.word} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span
            aria-hidden
            className={cn("grid h-full w-full place-items-center text-xl font-black", hue.chip)}
          >
            {wordEmoji(word.word, word.category) ?? word.word.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
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
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider", hue.chip)}>
            <Tag className="h-3 w-3" />
            {word.category}
          </span>
        )}
      </div>

      {word.example && (
        <p className="text-[13px] leading-6 text-foreground/85">
          <Example text={word.example} word={word.word} />
        </p>
      )}

      {showTranslation && (
        <div className={cn("space-y-1.5 rounded-xl border px-3 py-2.5", hue.chip)}>
          <span className="text-[9px] font-black uppercase tracking-[0.18em] opacity-70">Meaning in Arabic</span>
          <div dir="rtl" className="text-right">
            {word.translation && <p className="text-sm font-bold">{word.translation}</p>}
            {word.example_ar && <p className="text-[11px] leading-6 opacity-80">{word.example_ar.split(/\s+/).slice(0, 8).join(" ")}</p>}
            {!word.translation && !word.example_ar && (
              <p className="text-[11px] opacity-70">لا يوجد معنى متاح</p>
            )}
          </div>
        </div>
      )}


      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
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

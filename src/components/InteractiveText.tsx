import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Star, Volume2, X } from "lucide-react";
import {
  HIGHLIGHT_CLASSES,
  HIGHLIGHT_SWATCHES,
  setHighlight,
  useHighlight,
  type HighlightColor,
} from "@/lib/highlights";
import { toast } from "sonner";
import { useStarWord } from "@/hooks/useStarWord";
import { lookupWord, saveMyWord, type WordInfo } from "@/lib/learning.functions";
import { cn } from "@/lib/utils";
import { parseInline } from "@/lib/richtext";
import { primeAudio, playText, useAudioState } from "@/lib/audio";


/**
 * Speaks an English word/sentence. Uses a real generated MP3 (reliable on
 * iOS/Android) and only falls back to the browser speech engine if needed.
 * Safe to call directly from a click handler.
 */
export function speak(text: string, owner = "inline-speak") {
  primeAudio();
  void playText(text, owner);
}


export function SpeakButton({ text, className }: { text: string; className?: string }) {
  const owner = `speak:${text}`;
  const audio = useAudioState();
  const busy = audio.owner === owner && audio.status === "loading";
  const active = audio.owner === owner && audio.status === "playing";
  return (
    <button
      type="button"
      onClick={() => speak(text, owner)}
      aria-label={`Pronounce ${text}`}
      className={cn(
        "inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition touch-manipulation",
        active && "bg-primary text-primary-foreground",
        className,
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );

}

/** Star / save button usable on any word anywhere in the app. */
export function StarWordButton({
  word,
  translation,
  example,
  phonetic,
  className,
}: {
  word: string;
  translation?: string | null;
  example?: string | null;
  phonetic?: string | null;
  className?: string;
}) {
  const { starred, pending, toggle } = useStarWord(word, { translation, example, phonetic });

  return (
    <button
      type="button"
      title={starred ? "Remove from starred" : "Save & star in My Words"}
      aria-label={`Star ${word}`}
      onClick={() => toggle.mutate()}
      disabled={pending}
      className={cn(
        "inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-amber-500/10 hover:bg-amber-500/20 transition touch-manipulation",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
      ) : (
        <Star className={cn("h-4 w-4 text-amber-500", starred && "fill-amber-400")} />
      )}
    </button>
  );
}

function HighlightPicker({ word }: { word: string }) {
  const current = useHighlight(word);
  return (
    <div className="flex items-center gap-1.5 pt-1">
      {(Object.keys(HIGHLIGHT_SWATCHES) as HighlightColor[]).map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Highlight ${c}`}
          onClick={() => setHighlight(word, current === c ? null : c)}
          className={cn(
            "h-6 w-6 rounded-full ring-2 ring-transparent transition",
            HIGHLIGHT_SWATCHES[c],
            current === c && "ring-foreground/60 scale-110",
          )}
        />
      ))}
      {current && (
        <button
          type="button"
          onClick={() => setHighlight(word, null)}
          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-label="Remove highlight"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function WordChip({ word }: { word: string }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<WordInfo | null>(null);
  const highlight = useHighlight(word);
  const qc = useQueryClient();
  const star = useStarWord(word, {
    translation: info?.translation,
    phonetic: info?.phonetic,
    example: info?.example,
  });

  const lookup = useMutation({
    mutationFn: () => lookupWord({ data: { word } }),
    onSuccess: (d) => setInfo(d),
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: (starred: boolean) =>
      saveMyWord({
        data: {
          word,
          starred,
          ...(info?.translation ? { translation: info.translation } : {}),
          ...(info?.phonetic ? { phonetic: info.phonetic } : {}),
          ...(info?.example ? { example: info.example } : {}),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-words"] });
      toast.success("Added to my dictionary");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !info && !lookup.isPending) lookup.mutate();
      }}
    >
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onClick={() => speak(word)}
          onDoubleClick={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
          className={cn(
            "cursor-pointer rounded px-0.5 hover:bg-primary/10 hover:text-primary transition-colors",
            highlight && HIGHLIGHT_CLASSES[highlight],
          )}
        >
          {word}
        </span>
      </PopoverTrigger>
      <PopoverContent dir="rtl" className="w-64 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span dir="ltr" className="font-black text-lg">
            {word}
          </span>
          <SpeakButton text={word} />
        </div>
        {lookup.isPending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Translating...
          </p>
        )}
        {info && (
          <>
            <p className="text-base font-bold">{info.translation}</p>
            {info.phonetic && (
              <p dir="ltr" className="text-xs text-muted-foreground">
                {info.phonetic}
              </p>
            )}
            {info.example && (
              <p dir="ltr" className="text-sm text-muted-foreground italic">
                {info.example}
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => save.mutate(false)} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="mr-1">Save word</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                title={star.starred ? "Remove from starred" : "Save & star for later review"}
                onClick={() => star.toggle.mutate()}
                disabled={star.pending}
              >
                <Star className={cn("h-4 w-4 text-amber-500", star.starred && "fill-amber-400")} />
              </Button>
            </div>
          </>
        )}
        <HighlightPicker word={word} />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Renders text where every English word is clickable:
 * single click = pronunciation, double click = Arabic meaning + save to vocabulary.
 * Supports inline formatting: **bold**, *italic*, __underline__, ==highlight==,
 * ==blue|highlight==, !!red|colored text!!, `code`.
 */
export function InteractiveText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("leading-loose whitespace-pre-wrap", className)}>
      {parseInline(text).map((part, pi) => (
        <span key={pi} className={part.className}>
          {part.text.split(/(\s+)/).map((tok, i) => {
            const core = tok.match(/[A-Za-z][A-Za-z'-]*/);
            if (!core) return <span key={i}>{tok}</span>;
            const before = tok.slice(0, core.index ?? 0);
            const after = tok.slice((core.index ?? 0) + core[0].length);
            return (
              <span key={i}>
                {before}
                <WordChip word={core[0]} />
                {after}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
}

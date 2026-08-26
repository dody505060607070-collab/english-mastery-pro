import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Volume2 } from "lucide-react";
import { toast } from "sonner";
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

function WordChip({ word }: { word: string }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<WordInfo | null>(null);

  const lookup = useMutation({
    mutationFn: () => lookupWord({ data: { word } }),
    onSuccess: (d) => setInfo(d),
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () =>
      saveMyWord({
        data: {
          word,
          ...(info?.translation ? { translation: info.translation } : {}),
          ...(info?.phonetic ? { phonetic: info.phonetic } : {}),
          ...(info?.example ? { example: info.example } : {}),
        },
      }),
    onSuccess: () => toast.success("Added to my dictionary"),
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
          className="cursor-pointer rounded px-0.5 hover:bg-primary/10 hover:text-primary transition-colors"
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
                title="Save & star for later review"
                onClick={() => save.mutate(true)}
                disabled={save.isPending}
              >
                <Star className="h-4 w-4 text-amber-500" />
              </Button>
            </div>

          </>
        )}
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

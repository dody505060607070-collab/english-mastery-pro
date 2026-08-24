import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Volume2, ImageOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { primeAudio, playText, playUrl, useAudioState } from "@/lib/audio";
import { useMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

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
  const progress = words.length ? Math.round((words.filter((w) => learnedSet.has(w.word.toLowerCase())).length / words.length) * 100) : 0;

  if (!words.length) {
    return <p className="text-sm font-bold text-muted-foreground text-center py-6">لا توجد كلمات بعد</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-bold">
          <span>الكلمات المتقنة</span>
          <span className="text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {words.map((w) => (
          <WordCard
            key={w.word}
            word={w}
            isLearned={learnedSet.has(w.word.toLowerCase())}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
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
  const [flipped, setFlipped] = useState(false);
  const img = useMediaUrl(word.image_url);
  const wordAudio = useMediaUrl(word.word_audio);
  const sentenceAudio = useMediaUrl(word.sentence_audio);
  const audio = useAudioState();

  const wordOwner = `vocab-word:${word.word}`;
  const sentenceOwner = `vocab-sentence:${word.word}`;

  function play(owner: string, url: string | null, fallbackText?: string) {
    // Prime synchronously inside the tap so mobile browsers allow playback.
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
    <motion.div whileHover={{ y: -2 }}>
      <Card className={cn("overflow-hidden h-full", isLearned && "border-emerald-500/50 bg-emerald-500/5")}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 shrink-0 rounded-xl bg-muted grid place-items-center overflow-hidden">
              {img ? (
                <img src={img} alt={word.word} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <ImageOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0" dir="ltr">
              <div className="flex items-center gap-2">
                <p className="font-black text-lg truncate">{word.word}</p>
                <Button
                  size="icon"
                  variant={active(wordOwner) ? "default" : "ghost"}
                  className="h-9 w-9 shrink-0 touch-manipulation"
                  onClick={() => play(wordOwner, wordAudio, word.word)}
                  aria-label={`Listen to ${word.word}`}
                >
                  {busy(wordOwner) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>

              </div>
              {flipped && word.translation && (
                <p className="text-sm font-bold text-primary" dir="rtl">
                  {word.translation}
                </p>
              )}
            </div>
          </div>

          {flipped && word.example && (
            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
              <div className="flex items-start gap-2" dir="ltr">
                <p className="text-sm flex-1">{word.example}</p>
                <Button
                  size="icon"
                  variant={active(sentenceOwner) ? "default" : "ghost"}
                  className="h-9 w-9 shrink-0 touch-manipulation"
                  onClick={() => play(sentenceOwner, sentenceAudio, word.example ?? undefined)}
                  aria-label="Listen to example"
                >
                  {busy(sentenceOwner) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>

              </div>
              {word.example_ar && <p className="text-xs text-muted-foreground">{word.example_ar}</p>}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 font-bold" onClick={() => setFlipped((f) => !f)}>
              {flipped ? "إخفاء المعنى" : "إظهار المعنى"}
            </Button>
            <Button
              size="sm"
              variant={isLearned ? "secondary" : "default"}
              className="font-bold"
              onClick={() => onToggle?.(word.word, !isLearned)}
            >
              <Check className="h-4 w-4 ml-1" />
              {isLearned ? "متقنة" : "تعلمتها"}
            </Button>
          </div>

          {isLearned && (
            <Badge variant="secondary" className="text-[10px]">
              Learned
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

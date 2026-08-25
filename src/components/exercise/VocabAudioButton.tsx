import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { synthesizeSpeech } from "@/lib/tts.functions";
import type { VocabWord } from "@/lib/exercise-types";

/**
 * Admin helper: generates real MP3 files for a vocabulary word and its example
 * sentence, stores them, and saves the storage paths on the word.
 */
export function VocabAudioButton({
  word,
  onGenerated,
}: {
  word: VocabWord;
  onGenerated: (patch: Partial<VocabWord>) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!word.word?.trim()) {
      toast.error("Type the word first");
      return;
    }
    setBusy(true);
    try {
      const patch: Partial<VocabWord> = {};
      const w = await synthesizeSpeech({ data: { text: word.word.trim() } });
      patch.word_audio = w.path;
      if (word.example?.trim()) {
        const s = await synthesizeSpeech({ data: { text: word.example.trim() } });
        patch.sentence_audio = s.path;
      }
      onGenerated(patch);
      toast.success("Audio generated, don't forget to save");
    } catch (e) {
      toast.error((e as Error).message || "Could not generate audio");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className="font-bold" onClick={() => void generate()} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
      <span className="mr-1">Generate word and sentence audio</span>
    </Button>
  );
}

import { MessageSquare, Play, Square, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InteractiveText } from "@/components/InteractiveText";
import { isOwnerActive, primeAudio, playText, stopAudio, useAudioState } from "@/lib/audio";
import { cn } from "@/lib/utils";

type Turn = { speaker: string; text: string };

/** Parses "A: ... / B: ..." transcripts into speaker turns. */
export function parseDialogueTurns(body: string): Turn[] {
  const turns: Turn[] = [];
  for (const raw of body.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#{1,4}\s/.test(line)) {
      if (turns.length) break;
      continue;
    }
    const m = line.match(/^[-*]?\s*\*{0,2}([A-Za-z][A-Za-z .]{0,20})\*{0,2}\s*[:：]\s*(.+)$/);
    if (m) {
      const speaker = m[1]!.trim();
      const text = m[2]!.replace(/^\*+|\*+$/g, "").trim();
      const last = turns[turns.length - 1];
      if (last && last.speaker === speaker) last.text += " " + text;
      else turns.push({ speaker, text });
    } else if (turns.length) {
      turns[turns.length - 1]!.text += " " + line;
    }
  }
  if (turns.length < 2) return [];
  if (new Set(turns.map((t) => t.speaker)).size < 2) return [];
  return turns;
}

const VOICES = ["alloy", "nova", "echo", "shimmer"];

/** Renders a listening transcript as a readable two-person conversation. */
export function DialogueLesson({ body }: { body: string }) {
  const turns = parseDialogueTurns(body);
  const audio = useAudioState();
  if (!turns.length) return null;

  const speakers = Array.from(new Set(turns.map((t) => t.speaker)));
  const playing = isOwnerActive("dialogue-all", audio);

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-sm">
      <header className="flex items-center gap-3 border-b border-primary/20 bg-primary/10 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-card text-primary shadow-sm">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase text-primary">Conversation</p>
          <h3 className="text-base font-black">{speakers.join(" & ")}</h3>
        </div>
        <Button
          type="button"
          size="sm"
          variant={playing ? "destructive" : "default"}
          className="gap-1.5 font-bold"
          onClick={() => {
            if (playing) {
              stopAudio();
              return;
            }
            primeAudio();
            // playText detects the A:/B: dialogue, strips the labels, and
            // assigns a distinct voice per speaker automatically.
            void playText(body, "dialogue-all");
          }}
        >
          {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Stop" : "Play conversation"}
        </Button>
      </header>

      <div className="space-y-3 px-4 py-5 md:px-6" dir="ltr">
        {turns.map((turn, i) => {
          const side = speakers.indexOf(turn.speaker) % 2 === 0;
          const voice = VOICES[speakers.indexOf(turn.speaker) % VOICES.length]!;
          return (
            <div key={i} className={cn("flex gap-2", side ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl border px-4 py-3",
                  side ? "bg-primary/[0.08] border-primary/25" : "bg-muted/50 border-border",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-primary">{turn.speaker}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label={`Listen to ${turn.speaker}`}
                    onClick={() => {
                      primeAudio();
                      void playText(turn.text, `turn-${i}`, voice);
                    }}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <InteractiveText text={turn.text} className="text-[15px] leading-8 text-foreground" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

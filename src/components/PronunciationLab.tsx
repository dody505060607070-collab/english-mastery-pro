import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Ear, Mic, RefreshCw, Square, Trophy, Turtle, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { PhoneticsPrimer } from "@/components/PhoneticsPrimer";
import { SpeedControl, snapSpeed } from "@/components/SpeedControl";
import { patternFor, tierFor } from "@/lib/pronunciation-patterns";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  isOwnerActive,
  playText,
  primeAudio,
  rateForLevel,
  setPlaybackRate,
  stopAudio,
  useAudioState,
} from "@/lib/audio";
import { cn } from "@/lib/utils";

type Parsed = {
  focus: string;
  tip: string;
  pairs: [string, string][];
  words: string[];
  sentences: string[];
};

/** Removes IPA stress marks so speech + comparison use plain spelling. */
const plain = (s: string) => s.replace(/[ˈˌ]/g, "").trim();
const norm = (s: string) =>
  plain(s)
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function similarity(a: string, b: string): number {
  const s1 = norm(a);
  const s2 = norm(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 100;
  const m = s1.length;
  const n = s2.length;
  const prev = new Array<number>(m + 1);
  const cur = new Array<number>(m + 1);
  for (let i = 0; i <= m; i++) prev[i] = i;
  for (let j = 1; j <= n; j++) {
    cur[0] = j;
    for (let i = 1; i <= m; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      cur[i] = Math.min(cur[i - 1]! + 1, prev[i]! + 1, prev[i - 1]! + cost);
    }
    for (let i = 0; i <= m; i++) prev[i] = cur[i]!;
  }
  const dist = prev[m]!;
  const max = Math.max(m, n);
  return Math.max(0, Math.floor(((max - dist) / max) * 100));
}

/** Parses the structured pronunciation lesson body. */
export function parsePronunciation(body: string): Parsed {
  const sections: Record<string, string[]> = {};
  let key = "";
  for (const raw of (body ?? "").split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(/^#{1,4}\s*(.+?)\s*:?\s*$/);
    if (h) {
      key = h[1]!.toLowerCase();
      sections[key] = [];
      continue;
    }
    if (!key) continue;
    sections[key]!.push(line.replace(/^[-*]\s*/, "").replace(/^\d+[.)]\s*/, ""));
  }
  const find = (needle: string) =>
    Object.entries(sections).find(([k]) => k.includes(needle))?.[1] ?? [];
  const focusKey = Object.keys(sections).find((k) => k.startsWith("focus")) ?? "";
  const focus = focusKey.replace(/^focus[:\s]*/i, "").trim() || "Pronunciation";
  const tip = (sections[focusKey] ?? []).join(" ");
  const pairs = find("pair")
    .map((l) => l.split(/\s*[–—-]\s*/).map((p) => p.trim()))
    .filter((p) => p.length === 2 && p[0] && p[1]) as [string, string][];
  const words = find("word").filter(Boolean);
  const sentences = find("sentence").filter(Boolean);
  return { focus: focus.charAt(0).toUpperCase() + focus.slice(1), tip, pairs, words, sentences };
}

function scoreLabel(score: number) {
  if (score >= 90) return { text: "Excellent — native-like", tone: "text-emerald-600" };
  if (score >= 75) return { text: "Very good, keep going", tone: "text-emerald-600" };
  if (score >= 55) return { text: "Almost there — try again", tone: "text-amber-600" };
  return { text: "Not clear yet — listen and repeat", tone: "text-red-600" };
}

function SpeakButtons({ text, owner, rate }: { text: string; owner: string; rate: number }) {
  const audio = useAudioState();
  const active = isOwnerActive(owner, audio);
  const say = (r: number) => {
    primeAudio();
    if (active) {
      stopAudio();
      return;
    }
    setPlaybackRate(r);
    void playText(plain(text), owner);
  };
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button type="button" size="icon" variant="secondary" className="h-9 w-9" onClick={() => say(rate)} aria-label="Listen">
        {active ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
      <Button type="button" size="icon" variant="outline" className="h-9 w-9" onClick={() => say(0.72)} aria-label="Listen slowly">
        <Turtle className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** One "listen → record → get a score" drill row. */
function RepeatDrill({
  target,
  index,
  rate,
  onScore,
}: {
  target: string;
  index: number;
  rate: number;
  onScore: (score: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; heard: string } | null>(null);
  const recRef = useRef<any>(null);

  const record = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Your browser does not support the microphone check. Use Chrome.");
      return;
    }
    if (busy) {
      recRef.current?.stop();
      return;
    }
    stopAudio();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onstart = () => {
      setBusy(true);
      setResult(null);
    };
    rec.onresult = (e: any) => {
      const alts: string[] = Array.from(e.results?.[0] ?? []).map((a: any) => a.transcript);
      const best = alts.reduce(
        (acc, t) => {
          const s = similarity(t, target);
          return s > acc.score ? { score: s, heard: t } : acc;
        },
        { score: 0, heard: alts[0] ?? "" },
      );
      setResult(best);
      onScore(best.score);
    };
    rec.onerror = () => {
      setBusy(false);
      toast.error("Microphone error. Check the permission and try again.");
    };
    rec.onend = () => setBusy(false);
    recRef.current = rec;
    rec.start();
  };

  const label = result ? scoreLabel(result.score) : null;

  return (
    <li className="rounded-2xl border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-black">
          {index + 1}
        </span>
        <p className="flex-1 text-[15px] font-bold leading-6 break-words">{target}</p>
        <SpeakButtons text={target} owner={`pron-${index}-${target}`} rate={rate} />
        <Button
          type="button"
          size="sm"
          variant={busy ? "destructive" : "default"}
          className="h-9 shrink-0 font-black"
          onClick={record}
        >
          <Mic className="mr-1 h-4 w-4" />
          {busy ? "Listening…" : "Say it"}
        </Button>
      </div>
      {result && (
        <div className="mt-3 space-y-1 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center justify-between text-xs font-black">
            <span className={label!.tone}>{label!.text}</span>
            <span>{result.score}%</span>
          </div>
          <Progress value={result.score} className="h-2" />
          <p className="text-[11px] font-bold text-muted-foreground">We heard: “{result.heard}”</p>
        </div>
      )}
    </li>
  );
}

/** Minimal-pair ear training: hear one word, choose which one it was. */
function EarTraining({ pairs, rate }: { pairs: [string, string][]; rate: number }) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const targets = useMemo(
    () => pairs.map((p) => p[Math.random() < 0.5 ? 0 : 1]!),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pairs.length, round === 0],
  );
  const pair = pairs[round % pairs.length]!;
  const target = targets[round % targets.length]!;
  const done = round >= pairs.length;

  if (done) {
    return (
      <div className="rounded-2xl border bg-card p-4 text-center">
        <Trophy className="mx-auto h-6 w-6 text-amber-500" />
        <p className="mt-1 text-sm font-black">
          Ear training: {correct} / {pairs.length}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2 font-black"
          onClick={() => {
            setRound(0);
            setCorrect(0);
            setPicked(null);
          }}
        >
          <RefreshCw className="mr-1 h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-muted-foreground">
          Which word do you hear? ({round + 1}/{pairs.length})
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="font-black"
          onClick={() => {
            primeAudio();
            setPlaybackRate(rate);
            void playText(plain(target), `ear-${round}`);
          }}
        >
          <Volume2 className="mr-1 h-4 w-4" /> Play
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {pair.map((option) => {
          const isTarget = option === target;
          const chosen = picked === option;
          return (
            <Button
              key={option}
              type="button"
              variant="outline"
              className={cn(
                "h-11 font-black",
                picked && isTarget && "border-emerald-500 bg-emerald-500/10 text-emerald-700",
                picked && chosen && !isTarget && "border-red-500 bg-red-500/10 text-red-700",
              )}
              disabled={!!picked}
              onClick={() => {
                setPicked(option);
                if (isTarget) setCorrect((c) => c + 1);
                setTimeout(() => {
                  setPicked(null);
                  setRound((r) => r + 1);
                }, 900);
              }}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Practice-only pronunciation trainer built on one sound pattern per lesson:
 * explanation -> ear training -> word drills -> sentence drills -> speaking.
 */
export function PronunciationLab({ body, level }: { body: string; level?: string | null }) {
  const parsed = useMemo(() => parsePronunciation(body), [body]);
  const pattern = useMemo(
    () => patternFor(`${parsed.focus} ${body}`, `${level ?? ""}|${parsed.focus}`),
    [parsed.focus, body, level],
  );
  const tier = tierFor(level);
  const [speed, setSpeed] = useState(() => snapSpeed(rateForLevel(level)));
  const [scores, setScores] = useState<Record<string, number>>({});

  const pairs = parsed.pairs.length ? parsed.pairs : pattern.pairs.slice(0, tier.pairs);
  const words = (parsed.words.length ? parsed.words : pattern.words).slice(0, tier.words);
  const sentences = (parsed.sentences.length ? parsed.sentences : pattern.sentences).slice(
    0,
    tier.sentences,
  );
  const drills = useMemo(() => [...words, ...sentences], [words.join("|"), sentences.join("|")]);
  const attempted = Object.keys(scores).length;
  const average = attempted
    ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / attempted)
    : 0;

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
        <div className="flex items-center gap-2">
          <Ear className="h-5 w-5 text-cyan-600" />
          <h3 className="text-base font-black">Focus: {pattern.title}</h3>
          {level && (
            <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-[10px] font-black">
              {level}
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] font-bold text-muted-foreground">
          {parsed.tip || pattern.how}
        </p>
        <ul className="mt-2 space-y-1">
          {pattern.rules.map((r) => (
            <li key={r} className="text-[12px] font-bold text-foreground/80">
              • {r}
            </li>
          ))}
        </ul>
        <SpeedControl value={speed} onChange={setSpeed} className="mt-3" />
      </header>

      <PhoneticsPrimer level={level} rate={speed} />

      {pairs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            1 · Train your ear
          </p>
          <EarTraining pairs={pairs} rate={speed} />
        </div>
      )}

      {words.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            2 · Words practice — listen, then say it
          </p>
          <ul className="space-y-2">
            {words.map((d, i) => (
              <RepeatDrill
                key={`w-${i}-${d}`}
                target={d}
                index={i}
                rate={speed}
                onScore={(s) => setScores((prev) => ({ ...prev, [d]: Math.max(prev[d] ?? 0, s) }))}
              />
            ))}
          </ul>
        </div>
      )}

      {sentences.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            3 · Sentence practice
          </p>
          <ul className="space-y-2">
            {sentences.map((d, i) => (
              <RepeatDrill
                key={`s-${i}-${d}`}
                target={d}
                index={words.length + i}
                rate={speed}
                onScore={(s) => setScores((prev) => ({ ...prev, [d]: Math.max(prev[d] ?? 0, s) }))}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          4 · Speaking practice — use the sound in real speech
        </p>
        <ul className="space-y-2">
          {(parsed.speaking.length ? parsed.speaking : pattern.speaking).map((p, i) => (
            <RepeatDrill
              key={`sp-${i}`}
              target={p}
              index={drills.length + i}
              rate={speed}
              onScore={(s) => setScores((prev) => ({ ...prev, [p]: Math.max(prev[p] ?? 0, s) }))}
            />
          ))}
        </ul>
        <p className="text-[11px] font-bold text-muted-foreground">
          Answer out loud in full sentences — record yourself and keep the target sound clear.
        </p>
      </div>

      {attempted > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-black">
              Your pronunciation score: {average}% ({attempted} practised)
            </p>
            <Progress value={average} className="mt-2 h-2" />
          </div>
        </div>
      )}
    </section>
  );
}


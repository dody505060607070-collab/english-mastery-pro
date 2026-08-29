import { useMemo, useState } from "react";
import { BookOpenText, Square, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isOwnerActive, playText, primeAudio, setPlaybackRate, stopAudio, useAudioState } from "@/lib/audio";
import { cn } from "@/lib/utils";

type Sound = {
  ipa: string;
  type: "vowel" | "consonant" | "diphthong";
  examples: string[];
  how: string;
};

/** IPA inventory grouped by CEFR band: each band adds harder sounds. */
const BANDS: Record<"A1" | "A2" | "B1" | "B2" | "C1" | "C2", Sound[]> = {
  A1: [
    { ipa: "/iː/", type: "vowel", examples: ["see", "meet", "he"], how: "Long ee — smile, tongue high and front." },
    { ipa: "/ɪ/", type: "vowel", examples: ["sit", "it", "big"], how: "Short i — relaxed, never as long as /iː/." },
    { ipa: "/æ/", type: "vowel", examples: ["cat", "man", "bag"], how: "Open mouth wide, tongue low and front." },
    { ipa: "/p/", type: "consonant", examples: ["pen", "happy", "stop"], how: "Lips together with a puff of air." },
    { ipa: "/b/", type: "consonant", examples: ["book", "table", "job"], how: "Same as /p/ but with voice, no puff." },
  ],
  A2: [
    { ipa: "/ə/", type: "vowel", examples: ["about", "teacher", "sofa"], how: "Schwa — the weak, lazy sound in unstressed syllables." },
    { ipa: "/ʌ/", type: "vowel", examples: ["cup", "love", "but"], how: "Short and central, mouth slightly open." },
    { ipa: "/uː/", type: "vowel", examples: ["food", "blue", "two"], how: "Long oo — round the lips tightly." },
    { ipa: "/θ/", type: "consonant", examples: ["think", "three", "bath"], how: "Tongue tip between the teeth, no voice." },
    { ipa: "/ð/", type: "consonant", examples: ["this", "mother", "with"], how: "Same position as /θ/ but voiced." },
    { ipa: "/eɪ/", type: "diphthong", examples: ["day", "make", "eight"], how: "Glide from /e/ to /ɪ/ in one movement." },
  ],
  B1: [
    { ipa: "/ɜː/", type: "vowel", examples: ["bird", "work", "learn"], how: "Long central vowel, lips neutral." },
    { ipa: "/ɔː/", type: "vowel", examples: ["door", "talk", "four"], how: "Long, rounded, back of the mouth." },
    { ipa: "/ʃ/", type: "consonant", examples: ["she", "station", "fish"], how: "Push air over a wide tongue, lips slightly rounded." },
    { ipa: "/ʒ/", type: "consonant", examples: ["vision", "measure", "usual"], how: "Voiced version of /ʃ/." },
    { ipa: "/aɪ/", type: "diphthong", examples: ["time", "my", "five"], how: "Glide from open /a/ up to /ɪ/." },
    { ipa: "/əʊ/", type: "diphthong", examples: ["go", "phone", "know"], how: "Start at schwa, round the lips towards /ʊ/." },
  ],
  B2: [
    { ipa: "/ɒ/", type: "vowel", examples: ["hot", "job", "want"], how: "Short, rounded, back — not the American /ɑː/." },
    { ipa: "/ʊ/", type: "vowel", examples: ["book", "good", "put"], how: "Short oo, relaxed lips." },
    { ipa: "/ŋ/", type: "consonant", examples: ["sing", "thinking", "long"], how: "Back of the tongue on the soft palate, air through the nose." },
    { ipa: "/tʃ/", type: "consonant", examples: ["chair", "watch", "future"], how: "Stop then release into /ʃ/." },
    { ipa: "/dʒ/", type: "consonant", examples: ["job", "bridge", "age"], how: "Voiced partner of /tʃ/." },
    { ipa: "/ɪə/", type: "diphthong", examples: ["here", "near", "idea"], how: "Glide from /ɪ/ to schwa." },
  ],
  C1: [
    { ipa: "/eə/", type: "diphthong", examples: ["care", "hair", "where"], how: "Glide from /e/ to schwa; keep it smooth." },
    { ipa: "/ʊə/", type: "diphthong", examples: ["tour", "pure", "sure"], how: "From /ʊ/ to schwa — often replaced by /ɔː/." },
    { ipa: "/aʊ/", type: "diphthong", examples: ["now", "house", "sound"], how: "Open /a/ moving to rounded /ʊ/." },
    { ipa: "/ɔɪ/", type: "diphthong", examples: ["boy", "choice", "enjoy"], how: "From rounded /ɔː/ to /ɪ/." },
    { ipa: "/r/", type: "consonant", examples: ["red", "very", "around"], how: "Curl the tongue back; never trill it." },
    { ipa: "/l/", type: "consonant", examples: ["light", "call", "million"], how: "Clear /l/ before vowels, dark /ɫ/ at the end." },
  ],
  C2: [
    { ipa: "/ˈ/ stress", type: "consonant", examples: ["ˈrecord (noun)", "reˈcord (verb)", "ˈpresent"], how: "Word stress changes meaning and word class." },
    { ipa: "linking /r/", type: "consonant", examples: ["far away", "more or less", "here and there"], how: "Connect a final r-sound to the next vowel." },
    { ipa: "elision", type: "consonant", examples: ["nex(t) day", "mus(t) be", "han(d)bag"], how: "Native speakers drop /t/ and /d/ between consonants." },
    { ipa: "assimilation", type: "consonant", examples: ["ten bikes → tem bikes", "good boy", "that person"], how: "Sounds change to match the next sound." },
    { ipa: "weak forms", type: "vowel", examples: ["can /kən/", "to /tə/", "of /əv/"], how: "Function words reduce to schwa in fast speech." },
    { ipa: "intonation", type: "vowel", examples: ["Really?", "You're coming, aren't you?", "It's fine."], how: "Rising for doubt, falling for certainty." },
  ],
};

const bandOf = (level?: string | null): keyof typeof BANDS => {
  const m = (level ?? "").toUpperCase().match(/(A1|A2|B1|B2|C1|C2)/);
  return (m?.[1] as keyof typeof BANDS) ?? "A1";
};

const ORDER: (keyof typeof BANDS)[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function SoundRow({ sound, rate }: { sound: Sound; rate: number }) {
  const audio = useAudioState();
  const owner = `phon-${sound.ipa}`;
  const active = isOwnerActive(owner, audio);
  const [open, setOpen] = useState(false);
  const speech = sound.examples
    .map((e) => e.replace(/\(.*?\)/g, "").replace(/→.*/, "").replace(/\//g, " "))
    .join(", ");
  return (
    <li className="rounded-2xl border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="grid min-w-[64px] shrink-0 place-items-center rounded-xl bg-primary/10 px-2 py-1 text-sm font-black text-primary">
          {sound.ipa}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 text-left text-[14px] font-bold leading-6 break-words"
        >
          {sound.examples.join(" · ")}
        </button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-9 w-9 shrink-0"
          aria-label={`Listen to ${sound.ipa}`}
          onClick={() => {
            primeAudio();
            if (active) {
              stopAudio();
              return;
            }
            setPlaybackRate(rate);
            void playText(speech, owner);
          }}
        >
          {active ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>
      {open && <p className="mt-2 text-[12px] font-bold text-muted-foreground">{sound.how}</p>}
    </li>
  );
}

export function PhoneticsPrimer({ level, rate }: { level?: string | null | undefined; rate: number }) {
  const band = bandOf(level);
  const sounds = useMemo(() => {
    const idx = ORDER.indexOf(band);
    // Show the current band first, plus a short review of the previous one.
    const prev = idx > 0 ? BANDS[ORDER[idx - 1]!]!.slice(0, 3) : [];
    return [...BANDS[band]!, ...prev];
  }, [band]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <BookOpenText className="h-4 w-4 text-primary" />
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          Phonetics · {band} sounds
        </p>
      </div>
      <p className="text-[12px] font-bold text-muted-foreground">
        Tap a row to see how to make the sound · tap the speaker to hear the examples.
      </p>
      <ul className={cn("space-y-2")}>
        {sounds.map((s, i) => (
          <SoundRow key={`${s.ipa}-${i}`} sound={s} rate={rate} />
        ))}
      </ul>
    </div>
  );
}

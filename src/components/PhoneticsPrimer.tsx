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

type SubLevel =
  | "A1.1" | "A1.2" | "A2.1" | "A2.2"
  | "B1.1" | "B1.2" | "B2.1" | "B2.2"
  | "C1.1" | "C1.2" | "C2.1" | "C2.2";

/** IPA inventory: every sub-level gets its own, harder set of sounds. */
const BANDS: Record<SubLevel, Sound[]> = {
  "A1.1": [
    { ipa: "/iː/", type: "vowel", examples: ["see", "meet", "he"], how: "Long ee — smile, tongue high and front." },
    { ipa: "/ɪ/", type: "vowel", examples: ["sit", "it", "big"], how: "Short i — relaxed, never as long as /iː/." },
    { ipa: "/æ/", type: "vowel", examples: ["cat", "man", "bag"], how: "Open mouth wide, tongue low and front." },
    { ipa: "/p/", type: "consonant", examples: ["pen", "happy", "stop"], how: "Lips together with a puff of air." },
    { ipa: "/b/", type: "consonant", examples: ["book", "table", "job"], how: "Same as /p/ but with voice, no puff." },
    { ipa: "/m/", type: "consonant", examples: ["my", "name", "come"], how: "Lips closed, air through the nose." },
  ],
  "A1.2": [
    { ipa: "/e/", type: "vowel", examples: ["ten", "bed", "help"], how: "Short e — mouth half open, tongue front." },
    { ipa: "/ɑː/", type: "vowel", examples: ["car", "far", "start"], how: "Long open vowel from the back of the mouth." },
    { ipa: "/t/", type: "consonant", examples: ["time", "water", "sit"], how: "Tongue tip on the ridge behind the teeth." },
    { ipa: "/d/", type: "consonant", examples: ["day", "under", "red"], how: "Voiced partner of /t/." },
    { ipa: "/k/", type: "consonant", examples: ["cat", "school", "book"], how: "Back of the tongue on the soft palate + puff." },
    { ipa: "/g/", type: "consonant", examples: ["go", "again", "big"], how: "Voiced partner of /k/." },
  ],
  "A2.1": [
    { ipa: "/ə/", type: "vowel", examples: ["about", "teacher", "sofa"], how: "Schwa — the weak, lazy sound in unstressed syllables." },
    { ipa: "/ʌ/", type: "vowel", examples: ["cup", "love", "but"], how: "Short and central, mouth slightly open." },
    { ipa: "/f/", type: "consonant", examples: ["five", "coffee", "life"], how: "Top teeth on bottom lip, no voice." },
    { ipa: "/v/", type: "consonant", examples: ["very", "seven", "love"], how: "Same as /f/ but buzzing." },
    { ipa: "/eɪ/", type: "diphthong", examples: ["day", "make", "eight"], how: "Glide from /e/ to /ɪ/ in one movement." },
    { ipa: "/s/ vs /z/", type: "consonant", examples: ["bus / buzz", "price / prize", "place / plays"], how: "Same mouth shape, only the voice changes." },
  ],
  "A2.2": [
    { ipa: "/uː/", type: "vowel", examples: ["food", "blue", "two"], how: "Long oo — round the lips tightly." },
    { ipa: "/θ/", type: "consonant", examples: ["think", "three", "bath"], how: "Tongue tip between the teeth, no voice." },
    { ipa: "/ð/", type: "consonant", examples: ["this", "mother", "with"], how: "Same position as /θ/ but voiced." },
    { ipa: "/h/", type: "consonant", examples: ["hello", "behind", "house"], how: "Just breath — never drop it at the start." },
    { ipa: "/n/ vs /ŋ/", type: "consonant", examples: ["thin / thing", "sin / sing", "ran / rang"], how: "Tongue tip up for /n/, back of tongue for /ŋ/." },
    { ipa: "-ed", type: "consonant", examples: ["worked /t/", "played /d/", "wanted /ɪd/"], how: "Three endings: /t/, /d/ and the extra syllable /ɪd/." },
  ],
  "B1.1": [
    { ipa: "/ɜː/", type: "vowel", examples: ["bird", "work", "learn"], how: "Long central vowel, lips neutral." },
    { ipa: "/ɔː/", type: "vowel", examples: ["door", "talk", "four"], how: "Long, rounded, back of the mouth." },
    { ipa: "/ʃ/", type: "consonant", examples: ["she", "station", "fish"], how: "Push air over a wide tongue, lips slightly rounded." },
    { ipa: "/aɪ/", type: "diphthong", examples: ["time", "my", "five"], how: "Glide from open /a/ up to /ɪ/." },
    { ipa: "/əʊ/", type: "diphthong", examples: ["go", "phone", "know"], how: "Start at schwa, round the lips towards /ʊ/." },
    { ipa: "-s / -es", type: "consonant", examples: ["works /s/", "plays /z/", "watches /ɪz/"], how: "Three plural / third-person endings." },
  ],
  "B1.2": [
    { ipa: "/ʒ/", type: "consonant", examples: ["vision", "measure", "usual"], how: "Voiced version of /ʃ/." },
    { ipa: "/tʃ/", type: "consonant", examples: ["chair", "watch", "future"], how: "Stop then release into /ʃ/." },
    { ipa: "/dʒ/", type: "consonant", examples: ["job", "bridge", "age"], how: "Voiced partner of /tʃ/." },
    { ipa: "/ʊ/", type: "vowel", examples: ["book", "good", "put"], how: "Short oo, relaxed lips." },
    { ipa: "/ɒ/", type: "vowel", examples: ["hot", "job", "want"], how: "Short, rounded, back — not the American /ɑː/." },
    { ipa: "-tion", type: "consonant", examples: ["station", "action", "education"], how: "Always /ʃən/ — 'shun', with stress just before it." },
  ],
  "B2.1": [
    { ipa: "/ŋ/", type: "consonant", examples: ["sing", "thinking", "long"], how: "Back of the tongue on the soft palate, air through the nose." },
    { ipa: "/ɪə/", type: "diphthong", examples: ["here", "near", "idea"], how: "Glide from /ɪ/ to schwa." },
    { ipa: "/eə/", type: "diphthong", examples: ["care", "hair", "where"], how: "Glide from /e/ to schwa; keep it smooth." },
    { ipa: "/aʊ/", type: "diphthong", examples: ["now", "house", "sound"], how: "Open /a/ moving to rounded /ʊ/." },
    { ipa: "silent letters", type: "consonant", examples: ["know", "write", "listen"], how: "kn-, wr-, -st-, -mb: the letter is written, never said." },
    { ipa: "/ˈ/ stress", type: "consonant", examples: ["ˈrecord (noun)", "reˈcord (verb)", "ˈpresent"], how: "Word stress changes meaning and word class." },
  ],
  "B2.2": [
    { ipa: "/ɔɪ/", type: "diphthong", examples: ["boy", "choice", "enjoy"], how: "From rounded /ɔː/ to /ɪ/." },
    { ipa: "/ʊə/", type: "diphthong", examples: ["tour", "pure", "sure"], how: "From /ʊ/ to schwa — often replaced by /ɔː/." },
    { ipa: "/r/", type: "consonant", examples: ["red", "very", "around"], how: "Curl the tongue back; never trill it." },
    { ipa: "clear vs dark /l/", type: "consonant", examples: ["light", "call", "million"], how: "Clear /l/ before vowels, dark /ɫ/ at the end." },
    { ipa: "weak forms", type: "vowel", examples: ["can /kən/", "to /tə/", "of /əv/"], how: "Function words reduce to schwa in fast speech." },
    { ipa: "contractions", type: "consonant", examples: ["I'd've", "shouldn't've", "we'll"], how: "Squeeze the auxiliary into one short beat." },
  ],
  "C1.1": [
    { ipa: "linking /r/", type: "consonant", examples: ["far away", "more or less", "here and there"], how: "Connect a final r-sound to the next vowel." },
    { ipa: "linking C+V", type: "consonant", examples: ["an apple", "pick it up", "turn it on"], how: "Final consonant joins the next word's vowel." },
    { ipa: "elision", type: "consonant", examples: ["nex(t) day", "mus(t) be", "han(d)bag"], how: "Native speakers drop /t/ and /d/ between consonants." },
    { ipa: "assimilation", type: "consonant", examples: ["ten bikes → tem bikes", "good boy", "that person"], how: "Sounds change to match the next sound." },
    { ipa: "sentence stress", type: "vowel", examples: ["I SAID it", "I said IT", "I did say it"], how: "Stress the content word that carries the meaning." },
    { ipa: "glottal /t/", type: "consonant", examples: ["butter", "bottle", "what time"], how: "In many accents /t/ becomes a small stop in the throat." },
  ],
  "C1.2": [
    { ipa: "stress shift", type: "vowel", examples: ["ˈphotograph", "phoˈtographer", "photoˈgraphic"], how: "Adding a suffix moves the strong syllable." },
    { ipa: "vowel reduction", type: "vowel", examples: ["ˈcomfortable", "ˈvegetable", "ˈtemperature"], how: "Long words lose whole syllables in natural speech." },
    { ipa: "intrusive /w/ /j/", type: "consonant", examples: ["go(w) on", "the(j) end", "I(j) am"], how: "A tiny glide appears between two vowels." },
    { ipa: "/ɪ/ vs /iː/ in suffixes", type: "vowel", examples: ["happy", "coffee", "city"], how: "Final -y is a short, light /i/, not a full /iː/." },
    { ipa: "consonant clusters", type: "consonant", examples: ["strengths", "twelfths", "sixths"], how: "Keep every consonant, but never add a vowel between them." },
    { ipa: "tonic syllable", type: "vowel", examples: ["It's my BOOK.", "It's MY book.", "IT'S my book."], how: "The last stressed word carries the main pitch move." },
  ],
  "C2.1": [
    { ipa: "intonation", type: "vowel", examples: ["Really?", "You're coming, aren't you?", "It's fine."], how: "Rising for doubt, falling for certainty." },
    { ipa: "fall-rise", type: "vowel", examples: ["I liked it… (but)", "Possibly…", "It was fine…"], how: "A fall then a rise signals reservation or implication." },
    { ipa: "thought groups", type: "vowel", examples: ["When I arrived, | the room was empty.", "In fact, | nobody knew."], how: "Chunk speech into meaning units with tiny pauses." },
    { ipa: "de-stressing", type: "vowel", examples: ["given information", "as you know", "of course"], how: "Old information is said fast, low and quietly." },
    { ipa: "emphatic stress", type: "consonant", examples: ["absoˈLUTEly", "ˈNEVer", "unbeˈLIEVable"], how: "Lengthen and raise the pitch for emotion." },
    { ipa: "connected speech mix", type: "consonant", examples: ["what do you want → whaddaya want", "did you eat → didja eat"], how: "Linking, elision and assimilation happen together." },
  ],
  "C2.2": [
    { ipa: "accent contrast", type: "vowel", examples: ["dance (UK/US)", "schedule", "either"], how: "Recognise British and American differences and stay consistent." },
    { ipa: "rhythm", type: "vowel", examples: ["The BOY has GONE to the SHOP.", "stress-timed English"], how: "Stresses come at equal intervals; weak syllables squeeze." },
    { ipa: "pitch range", type: "vowel", examples: ["Honestly?", "That's incredible.", "Well, maybe."], how: "Wide pitch = engaged; flat pitch = bored or rude." },
    { ipa: "discourse intonation", type: "vowel", examples: ["First… | second… | finally.", "So, | to sum up…"], how: "Signposts get a distinct pitch pattern." },
    { ipa: "voice quality", type: "consonant", examples: ["creaky ending", "breathy softening", "clear projection"], how: "Control tone of voice for register and persuasion." },
    { ipa: "fast-speech drills", type: "consonant", examples: ["I would have thought so", "It shouldn't have been", "You might as well"], how: "Full reduction at natural conversational speed." },
  ],
};

const ORDER: SubLevel[] = [
  "A1.1", "A1.2", "A2.1", "A2.2",
  "B1.1", "B1.2", "B2.1", "B2.2",
  "C1.1", "C1.2", "C2.1", "C2.2",
];

const subLevelOf = (level?: string | null): SubLevel => {
  const t = (level ?? "").toUpperCase();
  const exact = t.match(/(A1|A2|B1|B2|C1|C2)\s*\.?\s*([12])/);
  if (exact) return `${exact[1]}.${exact[2]}` as SubLevel;
  const band = t.match(/(A1|A2|B1|B2|C1|C2)/)?.[1];
  return (band ? (`${band}.1` as SubLevel) : "A1.1");
};

function SoundRow({ sound, rate }: { sound: Sound; rate: number }) {
  const audio = useAudioState();
  const owner = `phon-${sound.ipa}`;
  const active = isOwnerActive(owner, audio);
  const [open, setOpen] = useState(false);
  const speech = sound.examples
    .map((e) => e.replace(/\(.*?\)/g, "").replace(/→.*/, "").replace(/\//g, " ").replace(/\|/g, " "))
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
  const sub = subLevelOf(level);
  const sounds = useMemo(() => {
    const idx = ORDER.indexOf(sub);
    // Current sub-level first, plus a short review of the previous one.
    const prev = idx > 0 ? BANDS[ORDER[idx - 1]!]!.slice(0, 2) : [];
    return [...BANDS[sub]!, ...prev];
  }, [sub]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <BookOpenText className="h-4 w-4 text-primary" />
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          Phonetics · {sub} sounds
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

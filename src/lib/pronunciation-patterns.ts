/**
 * Reusable library of the English sound patterns that cause the most trouble
 * for learners. Every pronunciation lesson is built from one pattern so the
 * student always gets: explanation -> words -> sentences -> free speaking.
 *
 * Adding a new lesson = adding one entry here, or writing the same sections
 * (## Focus / ## Minimal pairs / ## Words / ## Sentences / ## Speaking) in the
 * lesson body from the dashboard editor.
 */

export type PronPattern = {
  id: string;
  /** Human title, e.g. "TH — think vs this". */
  title: string;
  /** Short, plain-English explanation of how to make the sound. */
  how: string;
  /** Extra rule notes shown as bullets. */
  rules: string[];
  pairs: [string, string][];
  /** Ordered easy -> hard; higher levels get more of them. */
  words: string[];
  sentences: string[];
  /** Open prompt for the final speaking step. */
  speaking: string[];
};

export const PRON_PATTERNS: PronPattern[] = [
  {
    id: "th",
    title: "TH — think vs this",
    how: "Put the tip of your tongue lightly between your teeth and push air out. /θ/ (think) has no voice; /ð/ (this) buzzes in your throat.",
    rules: [
      "/θ/ voiceless: think, three, bath, month",
      "/ð/ voiced: this, mother, they, breathe",
      "Never replace TH with /s/, /z/, /t/ or /d/.",
    ],
    pairs: [
      ["think", "sink"],
      ["they", "day"],
      ["thin", "tin"],
      ["breathe", "breeze"],
    ],
    words: ["think", "this", "three", "mother", "birthday", "healthy", "although", "thoroughly"],
    sentences: [
      "I think this is the third one.",
      "They both thought the weather was healthy.",
      "My brother breathes through his mouth in this weather.",
    ],
    speaking: [
      "Tell me three things you think about your day, using this / that / these.",
      "Describe your family in 4 sentences using mother, brother, father.",
    ],
  },
  {
    id: "ed",
    title: "-ED endings — worked / played / wanted",
    how: "The -ed ending has three sounds. After a voiceless sound say /t/, after a voiced sound say /d/, and only after /t/ or /d/ do you say the extra syllable /ɪd/.",
    rules: [
      "/t/: worked, stopped, watched, laughed",
      "/d/: played, called, opened, arrived",
      "/ɪd/: wanted, needed, decided, started",
    ],
    pairs: [
      ["worked", "wanted"],
      ["played", "waited"],
      ["asked", "added"],
      ["missed", "visited"],
    ],
    words: ["worked", "played", "wanted", "stopped", "arrived", "decided", "developed", "recommended"],
    sentences: [
      "I worked, played and wanted more.",
      "She stopped, called me and decided to wait.",
      "They finished the project and recommended a new plan.",
    ],
    speaking: [
      "Tell me what you did yesterday in 5 sentences, all in the past.",
      "Describe a project you completed and how it started and ended.",
    ],
  },
  {
    id: "s-es",
    title: "S / ES endings — works / plays / watches",
    how: "Plural and third-person -s also has three sounds: /s/ after voiceless sounds, /z/ after voiced sounds, and /ɪz/ after s, z, sh, ch, ge sounds.",
    rules: [
      "/s/: works, cats, stops, laughs",
      "/z/: plays, dogs, runs, opens",
      "/ɪz/: watches, boxes, changes, finishes",
    ],
    pairs: [
      ["works", "watches"],
      ["cats", "cages"],
      ["books", "boxes"],
      ["stops", "chooses"],
    ],
    words: ["works", "plays", "watches", "boxes", "changes", "finishes", "manages", "encourages"],
    sentences: [
      "He works, plays and watches films.",
      "She changes her clothes and finishes her classes.",
      "The manager organises the boxes and manages the changes.",
    ],
    speaking: [
      "Describe your friend's daily routine using he/she + verb.",
      "Talk about what your family does every weekend.",
    ],
  },
  {
    id: "tion",
    title: "-TION / -SION — information, station",
    how: "-tion is always /ʃən/, never 'tee-on'. Say 'shun'. The stress goes on the syllable right before it.",
    rules: [
      "-tion → /ʃən/: station, nation, action",
      "-sion after a vowel → /ʒən/: vision, decision",
      "Stress: inforMAtion, educAtion, deciSION",
    ],
    pairs: [
      ["station", "situation"],
      ["vision", "vacation"],
      ["action", "auction"],
      ["decision", "division"],
    ],
    words: ["station", "action", "nation", "education", "information", "decision", "pronunciation", "administration"],
    sentences: [
      "I need information about the station.",
      "Her decision about education was a good action.",
      "The organisation published information on the situation.",
    ],
    speaking: [
      "Talk about your education in 4 sentences.",
      "Explain a decision you made and the information you used.",
    ],
  },
  {
    id: "sh-ch",
    title: "SH vs CH — she / chair",
    how: "/ʃ/ (she) is a long, smooth stream of air. /tʃ/ (chair) starts with a small stop, like a t, then releases into /ʃ/.",
    rules: [
      "/ʃ/: she, English, machine, sure",
      "/tʃ/: chair, teacher, watch, future",
      "-ture is usually /tʃə/: future, nature, picture",
    ],
    pairs: [
      ["ship", "chip"],
      ["share", "chair"],
      ["wash", "watch"],
      ["sheep", "cheap"],
    ],
    words: ["she", "chair", "English", "teacher", "machine", "picture", "adventure", "champion"],
    sentences: [
      "She sat on the chair in the English class.",
      "The teacher showed a picture of the machine.",
      "Each future adventure should be a fresh chance.",
    ],
    speaking: [
      "Describe your English teacher and your classroom.",
      "Talk about a picture you like and why you chose it.",
    ],
  },
  {
    id: "ph",
    title: "PH — phone, photo",
    how: "PH is always /f/. Bite your bottom lip lightly and push air — exactly like the letter F.",
    rules: [
      "PH → /f/: phone, photo, graph, elephant",
      "GH can also be /f/: enough, laugh, cough",
      "Never say /p/ + /h/ separately.",
    ],
    pairs: [
      ["phone", "pone"],
      ["photo", "potato"],
      ["graph", "grab"],
      ["laugh", "lab"],
    ],
    words: ["phone", "photo", "graph", "elephant", "physics", "geography", "philosophy", "atmosphere"],
    sentences: [
      "I took a photo with my phone.",
      "The geography graph is on the physics page.",
      "His philosophy paper described the atmosphere in detail.",
    ],
    speaking: [
      "Describe the last photo you took on your phone.",
      "Talk about a school subject you enjoyed and why.",
    ],
  },
  {
    id: "vw",
    title: "V vs W — very / west",
    how: "For /v/ your top teeth touch your bottom lip. For /w/ your lips are round and never touch your teeth.",
    rules: [
      "/v/: very, video, love, arrive",
      "/w/: west, water, work, always",
      "Keep /v/ buzzing — it is voiced, not /f/.",
    ],
    pairs: [
      ["very", "wary"],
      ["vest", "west"],
      ["vine", "wine"],
      ["veil", "whale"],
    ],
    words: ["very", "west", "video", "water", "arrive", "wonderful", "involve", "overwhelming"],
    sentences: [
      "The video was very wonderful.",
      "We always arrive with water from the west.",
      "Everyone was involved in the overwhelming victory.",
    ],
    speaking: [
      "Describe a video you watched recently.",
      "Talk about the weather where you live.",
    ],
  },
  {
    id: "silent",
    title: "Silent letters — know, write, listen",
    how: "Many English words have letters you never say. Learn the pattern, not the spelling.",
    rules: [
      "kn- → /n/: know, knee, knife",
      "wr- → /r/: write, wrong, wrist",
      "-st-, -mb, -lk: listen, castle, climb, talk",
    ],
    pairs: [
      ["know", "now"],
      ["write", "right"],
      ["climb", "clim"],
      ["talk", "tock"],
    ],
    words: ["know", "write", "listen", "climb", "castle", "island", "honest", "receipt"],
    sentences: [
      "I know how to write and listen.",
      "The honest climber walked to the castle.",
      "Please keep the receipt from the island trip.",
    ],
    speaking: [
      "Tell me what you know how to do well.",
      "Describe a place you visited using island, castle, walk.",
    ],
  },
  {
    id: "stress",
    title: "Word stress — ˈrecord vs reˈcord",
    how: "English words have one strong syllable. Making the wrong syllable strong is the biggest reason learners are hard to understand.",
    rules: [
      "Nouns often stress the first syllable: ˈpresent, ˈrecord",
      "Verbs often stress the second: preˈsent, reˈcord",
      "The unstressed syllables reduce to schwa /ə/.",
    ],
    pairs: [
      ["ˈrecord", "reˈcord"],
      ["ˈpresent", "preˈsent"],
      ["ˈobject", "obˈject"],
      ["ˈincrease", "inˈcrease"],
    ],
    words: ["record", "present", "object", "increase", "photograph", "photographer", "economy", "economic"],
    sentences: [
      "I want to record a new record.",
      "The photographer will present the photograph.",
      "Economic growth increased the whole economy.",
    ],
    speaking: [
      "Present something you own and explain why it matters.",
      "Talk about the economy of your city in 4 sentences.",
    ],
  },
  {
    id: "linking",
    title: "Linking & connected speech",
    how: "Native speakers join words together. A final consonant links to the next vowel, and small words reduce to schwa.",
    rules: [
      "Consonant + vowel: 'an apple' → 'a-napple'",
      "Weak forms: can /kən/, to /tə/, of /əv/",
      "Elision: nex(t) day, mus(t) be",
    ],
    pairs: [
      ["an apple", "a napple"],
      ["want to", "wanna"],
      ["going to", "gonna"],
      ["a lot of", "a lotta"],
    ],
    words: ["an apple", "pick it up", "far away", "kind of", "a cup of tea", "what do you", "next day", "must be"],
    sentences: [
      "I want to pick it up in an hour.",
      "It's kind of far away, so I'll be there the next day.",
      "What do you think about a cup of tea after all of this?",
    ],
    speaking: [
      "Say five sentences fast and smoothly, linking the words.",
      "Explain your plan for tomorrow using going to and want to.",
    ],
  },
];

const TIER: Record<string, { words: number; sentences: number; pairs: number }> = {
  A1: { words: 4, sentences: 2, pairs: 2 },
  A2: { words: 5, sentences: 2, pairs: 3 },
  B1: { words: 6, sentences: 3, pairs: 3 },
  B2: { words: 7, sentences: 3, pairs: 4 },
  C1: { words: 8, sentences: 3, pairs: 4 },
  C2: { words: 8, sentences: 3, pairs: 4 },
};

/** Difficulty budget for a CEFR level label such as "B1.2". */
export function tierFor(level?: string | null) {
  const band = ((level ?? "").toUpperCase().match(/(A1|A2|B1|B2|C1|C2)/)?.[1] ?? "A1") as keyof typeof TIER;
  return TIER[band]!;
}

/**
 * Chooses the pattern for a lesson: by an explicit mention in the body/title,
 * otherwise a stable pick so different units get different sounds.
 */
export function patternFor(text: string, seed: string): PronPattern {
  const t = (text ?? "").toLowerCase();
  const hit = PRON_PATTERNS.find(
    (p) =>
      t.includes(p.id) ||
      p.title
        .toLowerCase()
        .split(/[—/,]/)[0]!
        .trim()
        .split(" ")
        .every((w) => w.length > 2 && t.includes(w)),
  );
  if (hit) return hit;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PRON_PATTERNS[h % PRON_PATTERNS.length]!;
}

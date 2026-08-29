/**
 * Reusable library of the English sound patterns that cause the most trouble
 * for learners. Every pronunciation lesson is built from one pattern so the
 * student always gets: explanation -> words -> sentences -> free speaking.
 *
 * Each pattern keeps a LARGE bank of words/sentences ordered easy -> hard.
 * `selectForLevel` rotates a different slice of that bank for every CEFR
 * sub-level (A1.1 ... C2.2) so no two levels drill the same words.
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
      ["three", "free"],
      ["mouth", "mouse"],
      ["thought", "taught"],
      ["either", "eater"],
    ],
    words: [
      "the", "this", "that", "think", "three", "thank", "with", "both",
      "mother", "father", "birthday", "nothing", "healthy", "weather", "northern", "thirteen",
      "although", "thoroughly", "thousandth", "rhythm", "clothes", "months", "breathe", "worthwhile",
      "sympathetic", "enthusiastic", "trustworthy", "hypothesis", "arithmetic", "nevertheless",
    ],
    sentences: [
      "This is the third one.",
      "I think that is my bag.",
      "Thank you for the three books.",
      "They both thought the weather was healthy.",
      "My brother breathes through his mouth.",
      "There are thirteen months of nothing there.",
      "The northern clothes are worth thousands.",
      "Nevertheless, the hypothesis was thoroughly tested.",
      "Her enthusiastic thanks were both warm and trustworthy.",
    ],
    speaking: [
      "Tell me three things you think about your day, using this / that / these.",
      "Describe your family in 4 sentences using mother, brother, father.",
      "Explain a theory or an idea you believe in, using think, though, although.",
      "Talk about the weather this month and last month.",
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
      ["watched", "counted"],
      ["closed", "landed"],
      ["helped", "hated"],
      ["cleaned", "created"],
    ],
    words: [
      "worked", "played", "wanted", "stopped", "called", "needed", "opened", "started",
      "watched", "arrived", "decided", "cleaned", "finished", "counted", "learned", "invited",
      "developed", "recommended", "described", "translated", "organised", "identified", "established", "appreciated",
      "acknowledged", "collaborated", "differentiated", "substantiated", "prioritised", "underestimated",
    ],
    sentences: [
      "I worked and played.",
      "She wanted more time.",
      "They stopped and waited.",
      "He called me and decided to wait.",
      "We finished the class and counted the points.",
      "The team developed a plan and recommended a change.",
      "She described the problem and translated the report.",
      "They acknowledged the risk and prioritised the safest option.",
      "Nobody anticipated how quickly the market had shifted.",
    ],
    speaking: [
      "Tell me what you did yesterday in 5 sentences, all in the past.",
      "Describe a project you completed and how it started and ended.",
      "Talk about a trip you enjoyed: what you visited, watched and learned.",
      "Explain a decision you made last year and why you changed it.",
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
      ["laughs", "washes"],
      ["maps", "matches"],
      ["runs", "rises"],
      ["prints", "prices"],
    ],
    words: [
      "cats", "dogs", "books", "plays", "works", "runs", "boxes", "watches",
      "changes", "washes", "finishes", "chooses", "teaches", "prices", "houses", "matches",
      "manages", "encourages", "practises", "increases", "researches", "analyses", "expresses", "produces",
      "distinguishes", "acknowledges", "emphasises", "compromises", "specialises", "prioritises",
    ],
    sentences: [
      "He works and plays.",
      "She watches films.",
      "The cats and dogs run outside.",
      "He changes his clothes and finishes his classes.",
      "My teacher teaches two classes and manages the boxes.",
      "The manager organises the prices and encourages the team.",
      "She researches the topic and expresses her ideas clearly.",
      "He distinguishes the facts and emphasises the main risks.",
      "The company specialises in services that increase productivity.",
    ],
    speaking: [
      "Describe your friend's daily routine using he/she + verb.",
      "Talk about what your family does every weekend.",
      "Describe what your teacher does in class every day.",
      "Explain what a good manager does in a company.",
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
      ["nation", "notion"],
      ["mission", "motion"],
      ["section", "suggestion"],
      ["relation", "revision"],
    ],
    words: [
      "action", "station", "nation", "section", "question", "vision", "mission", "option",
      "education", "information", "decision", "direction", "attention", "solution", "position", "invitation",
      "pronunciation", "organisation", "administration", "communication", "qualification", "recommendation", "investigation", "consideration",
      "differentiation", "internationalisation", "individualisation", "conceptualisation", "rationalisation", "characterisation",
    ],
    sentences: [
      "I need information.",
      "The station is near.",
      "Ask a question about the section.",
      "Her decision about education was good.",
      "Pay attention to the direction and the solution.",
      "The organisation published information on the situation.",
      "Good communication needs pronunciation and preparation.",
      "The investigation led to a recommendation for administration reform.",
      "Rationalisation without consideration produces poor implementation.",
    ],
    speaking: [
      "Talk about your education in 4 sentences.",
      "Explain a decision you made and the information you used.",
      "Describe the organisation you work or study in.",
      "Give a recommendation about improving communication at work.",
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
      ["shoes", "choose"],
      ["cash", "catch"],
      ["shop", "chop"],
      ["marsh", "march"],
    ],
    words: [
      "she", "shop", "chair", "chip", "fish", "watch", "shoes", "cheese",
      "English", "teacher", "machine", "picture", "kitchen", "finish", "children", "sandwich",
      "adventure", "champion", "shortage", "researcher", "sufficient", "manufacture", "architecture", "efficiency",
      "sponsorship", "achievement", "conscientious", "infrastructure", "apprenticeship", "questionnaire",
    ],
    sentences: [
      "She has a chair.",
      "The fish is cheap.",
      "The children watch a match.",
      "She sat on the chair in the English class.",
      "The teacher showed a picture of the machine.",
      "The kitchen shop finished the sandwich order.",
      "Each future adventure should be a fresh chance.",
      "The researcher published sufficient data on manufacturing efficiency.",
      "Conscientious apprenticeships strengthen the whole infrastructure.",
    ],
    speaking: [
      "Describe your English teacher and your classroom.",
      "Talk about a picture you like and why you chose it.",
      "Describe your kitchen and what you cook there.",
      "Explain a challenge you faced and how you achieved a solution.",
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
      ["phase", "pace"],
      ["cough", "cop"],
      ["rough", "rob"],
      ["sphere", "spear"],
    ],
    words: [
      "phone", "photo", "graph", "laugh", "enough", "elephant", "phrase", "orphan",
      "physics", "geography", "alphabet", "telephone", "paragraph", "pharmacy", "emphasis", "prophet",
      "philosophy", "atmosphere", "photographer", "phenomenon", "sophisticated", "hemisphere", "metaphor", "biography",
      "phonetics", "amphitheatre", "photosynthesis", "philanthropic", "paraphrasing", "phenomenal",
    ],
    sentences: [
      "I have a phone.",
      "That photo is nice.",
      "The graph is enough for now.",
      "I took a photo with my phone.",
      "The geography graph is on the physics page.",
      "The photographer emphasised the atmosphere in each paragraph.",
      "His philosophy paper described the phenomenon in detail.",
      "Phonetics and photosynthesis both come from Greek roots.",
      "The philanthropic biography was phenomenally sophisticated.",
    ],
    speaking: [
      "Describe the last photo you took on your phone.",
      "Talk about a school subject you enjoyed and why.",
      "Explain how you use your phone during a normal day.",
      "Describe a phenomenon in science that fascinates you.",
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
      ["vet", "wet"],
      ["verse", "worse"],
      ["viper", "wiper"],
      ["vow", "wow"],
    ],
    words: [
      "very", "west", "water", "work", "love", "video", "seven", "window",
      "arrive", "weekend", "advice", "wonderful", "voice", "always", "believe", "wallet",
      "involve", "overwhelming", "vulnerable", "worthwhile", "wavelength", "voluntary", "worldwide", "innovative",
      "unavoidable", "overwhelmingly", "vocabulary", "warehouse", "conversation", "ावailability",
    ],
    sentences: [
      "The water is very cold.",
      "We work in the west.",
      "I love this video.",
      "We always arrive with water from the west.",
      "The weekend advice was wonderful.",
      "Everyone was involved in the overwhelming victory.",
      "The voluntary work improved our vocabulary worldwide.",
      "Vulnerable workers value innovative and worthwhile support.",
      "The conversation was unavoidable yet overwhelmingly valuable.",
    ],
    speaking: [
      "Describe a video you watched recently.",
      "Talk about the weather where you live.",
      "Describe your weekend using work, water, walk, visit.",
      "Explain a value you believe in and why it is worthwhile.",
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
      ["knight", "night"],
      ["whole", "hole"],
      ["hour", "our"],
      ["psalm", "sam"],
    ],
    words: [
      "know", "write", "walk", "talk", "knee", "wrong", "half", "climb",
      "listen", "castle", "island", "honest", "answer", "knife", "whistle", "thumb",
      "receipt", "column", "muscle", "subtle", "doubt", "solemn", "debris", "rhythm",
      "psychology", "handkerchief", "silhouette", "conscience", "miscellaneous", "indictment",
    ],
    sentences: [
      "I know the answer.",
      "Please write it down.",
      "We walk and talk.",
      "I know how to write and listen.",
      "The honest climber walked to the castle.",
      "Keep the receipt from the island trip.",
      "There is no doubt about the subtle rhythm.",
      "His conscience made the solemn indictment inevitable.",
      "A miscellaneous silhouette appeared behind the psychology building.",
    ],
    speaking: [
      "Tell me what you know how to do well.",
      "Describe a place you visited using island, castle, walk.",
      "Talk about an honest answer you had to give someone.",
      "Explain a subtle difference between two things you know well.",
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
      ["ˈproduce", "proˈduce"],
      ["ˈcontrast", "conˈtrast"],
      ["ˈpermit", "perˈmit"],
      ["ˈconduct", "conˈduct"],
    ],
    words: [
      "table", "水ater", "record", "present", "object", "before", "hotel", "begin",
      "increase", "produce", "permit", "contrast", "export", "conflict", "progress", "suspect",
      "photograph", "photographer", "economy", "economic", "politics", "political", "analysis", "analytical",
      "characteristic", "administrative", "responsibility", "differentiate", "entrepreneurial", "incomprehensible",
    ],
    sentences: [
      "This is my record.",
      "I want to present it.",
      "The hotel is before the station.",
      "I want to record a new record.",
      "They export goods and the exports increase.",
      "The photographer will present the photograph.",
      "Economic growth increased the whole economy.",
      "Her analytical analysis of the political conflict was excellent.",
      "Administrative responsibility requires an entrepreneurial characteristic.",
    ],
    speaking: [
      "Present something you own and explain why it matters.",
      "Talk about the economy of your city in 4 sentences.",
      "Describe a conflict at work and the progress you made.",
      "Explain your main responsibility and how you handle it.",
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
      ["got you", "gotcha"],
      ["did you", "didja"],
      ["out of", "outta"],
      ["let me", "lemme"],
    ],
    words: [
      "an apple", "in it", "on a", "pick it up", "a cup of tea", "far away", "come on", "turn it on",
      "kind of", "next day", "must be", "what do you", "sort of", "get out", "hold on", "give it a go",
      "should have been", "would have thought", "as a matter of fact", "a couple of hours", "not at all", "in and out", "one of a kind", "more or less",
      "might as well have", "could have gone ahead", "it's not as if I", "for all intents and purposes", "if I'd known about it", "you should have told me earlier",
    ],
    sentences: [
      "Pick it up.",
      "I want an apple.",
      "Come on in and sit down.",
      "I want to pick it up in an hour.",
      "It's kind of far away, so I'll be there the next day.",
      "What do you think about a cup of tea after all of this?",
      "I should have told you as a matter of fact.",
      "For all intents and purposes, it's more or less finished already.",
      "If I'd known about it earlier, I might as well have gone ahead.",
    ],
    speaking: [
      "Say five sentences fast and smoothly, linking the words.",
      "Explain your plan for tomorrow using going to and want to.",
      "Tell a short story fast, linking every consonant to the next vowel.",
      "Give your opinion using weak forms: of, to, can, have.",
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

const SUB_ORDER = [
  "A1.1", "A1.2", "A2.1", "A2.2",
  "B1.1", "B1.2", "B2.1", "B2.2",
  "C1.1", "C1.2", "C2.1", "C2.2",
] as const;

/** 0-based index of the CEFR sub-level, e.g. "B1.2" -> 5. */
export function subLevelIndex(level?: string | null): number {
  const t = (level ?? "").toUpperCase();
  const exact = t.match(/(A1|A2|B1|B2|C1|C2)\s*\.?\s*([12])/);
  const key = exact ? `${exact[1]}.${exact[2]}` : `${t.match(/(A1|A2|B1|B2|C1|C2)/)?.[1] ?? "A1"}.1`;
  const i = SUB_ORDER.indexOf(key as (typeof SUB_ORDER)[number]);
  return i < 0 ? 0 : i;
}

/**
 * Takes a slice of `bank` that is unique per sub-level: each level starts
 * where the previous level's slice ended, wrapping around the bank. Harder
 * items sit later in every bank, so higher levels naturally get harder items.
 */
function windowFor<T>(bank: T[], count: number, idx: number): T[] {
  if (bank.length === 0) return [];
  const n = Math.min(count, bank.length);
  // Cumulative offset so level N never repeats level N-1's items.
  const start = ((idx * (n + 1)) % bank.length + bank.length) % bank.length;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(bank[(start + i) % bank.length]!);
  return out;
}

/** Level-specific, non-repeating drill set for a pattern. */
export function selectForLevel(pattern: PronPattern, level?: string | null) {
  const tier = tierFor(level);
  const idx = subLevelIndex(level);
  return {
    pairs: windowFor(pattern.pairs, tier.pairs, idx),
    words: windowFor(pattern.words, tier.words, idx),
    sentences: windowFor(pattern.sentences, tier.sentences, idx),
    speaking: windowFor(pattern.speaking, 2, idx),
  };
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

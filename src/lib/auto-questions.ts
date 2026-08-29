/**
 * Builds interactive questions from a lesson body when a content section has
 * no stored `data.questions`. Everything is derived from the existing markdown
 * (Comprehension / Practice + Answers, word lists, common mistakes, recaps),
 * so every unit becomes tap-and-check interactive with no extra content cost.
 */
import type { Question, VocabWord } from "@/lib/exercise-types";

/** Deterministic PRNG so options keep the same order between renders. */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return Math.abs(h) / 2147483647;
  };
}

function shuffled<T>(arr: T[], seed: string): T[] {
  const rand = rng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function sections(body: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  let cur: string | null = null;
  for (const line of (body ?? "").split("\n")) {
    const m = /^##\s+(.*)$/.exec(line.trim());
    if (m) {
      cur = m[1]!.trim();
      out[cur] = [];
    } else if (cur) {
      out[cur]!.push(line.trimEnd());
    }
  }
  return out;
}

function numbered(lines: string[] = []): Map<number, string> {
  const res = new Map<number, string>();
  for (const l of lines) {
    const m = /^\s*(\d+)[.)]\s*(.+)$/.exec(l);
    if (m) res.set(Number(m[1]), m[2]!.trim());
  }
  return res;
}

function bullets(lines: string[] = []): string[] {
  return lines.filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s*/, "").trim());
}

function tableRows(lines: string[] = []): string[][] {
  const rows: string[][] = [];
  for (const l of lines) {
    if (!l.trim().startsWith("|")) continue;
    const cells = l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (cells.join("").replace(/[-:\s]/g, "") === "") continue;
    rows.push(cells);
  }
  return rows;
}

function mcq(
  id: string,
  prompt: string,
  correct: string,
  pool: string[],
  explanation?: string,
): Question | null {
  const distract = [...new Set(pool)].filter(
    (p) => p && p.trim().toLowerCase() !== correct.trim().toLowerCase(),
  );
  const options = shuffled([correct, ...shuffled(distract, id).slice(0, 3)], `${id}o`);
  if (options.length < 3) return null;
  return { id, type: "mcq", prompt, options, answer: correct, points: 1, ...(explanation ? { explanation } : {}) };
}

/** Removes the answer key so students never see it inside the lesson text. */
export function stripAnswers(body: string | null | undefined): string {
  return (body ?? "").replace(/\n##\s+Answers\b[\s\S]*?(?=\n##\s|$)/g, "\n");
}

export function buildAutoQuestions(
  contentType: string,
  body: string | null | undefined,
  words: VocabWord[] = [],
): Question[] {
  const s = sections(body ?? "");
  const qs: Question[] = [];
  const answers = numbered(s["Answers"]);

  // 1) Existing question + answer key pairs -> multiple choice / true-false
  for (const head of ["Comprehension", "Practice", "Practice questions", "Questions"]) {
    const src = s[head];
    if (!src || answers.size === 0) continue;
    const items = numbered(src);
    const pool = [...answers.values()];
    items.forEach((prompt, k) => {
      const correct = answers.get(k);
      if (!correct) return;
      if (/^\s*yes\b/i.test(correct) || /^\s*no\b/i.test(correct)) {
        qs.push({
          id: `a${k}`,
          type: "truefalse",
          prompt: `True or false? ${prompt.replace(/\?$/, "")}`,
          answer: /^\s*yes\b/i.test(correct) ? "true" : "false",
          points: 1,
          explanation: correct,
        });
      } else {
        const q = mcq(`a${k}`, prompt, correct, pool);
        if (q) qs.push(q);
      }
    });
    break;
  }

  // 2) Vocabulary -> choose the correct word for the gap
  if (contentType === "vocabulary") {
    const rows = tableRows(s["Word list"]).filter(
      (r) => r.length >= 4 && r[0]!.toLowerCase() !== "word",
    );
    const list: { word: string; example: string; meaning?: string }[] = rows.length
      ? rows.map((r) => ({ word: r[0]!, example: r[3]!, meaning: r[2] ?? "" }))
      : words.map((w) => ({ word: w.word, example: w.example ?? "", meaning: w.translation ?? "" }));
    const all = list.map((w) => w.word);
    list.slice(0, 12).forEach((w, i) => {
      if (!w.example) return;
      const gap = w.example.replace(new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "______");
      if (!gap.includes("______")) return;
      const q = mcq(`v${i}`, `Choose the correct word: ${gap}`, w.word, all, w.meaning ? `${w.word} — ${w.meaning}` : undefined);
      if (q) qs.push(q);
    });
  }

  // 3) Grammar -> pick the correct sentence, match the form, recap true/false
  if (contentType === "grammar") {
    (s["Common Mistakes"] ?? []).forEach((line, i) => {
      const m = /^~~(.+?)~~\s*->\s*(.+)$/.exec(line.trim());
      if (!m) return;
      const wrong = m[1]!.trim();
      const right = m[2]!.trim();
      qs.push({
        id: `g${i}`,
        type: "mcq",
        prompt: "Which sentence is correct?",
        options: shuffled([right, wrong], `g${i}`),
        answer: right,
        points: 1,
        explanation: `Common mistake: ${wrong}`,
      });
    });
    const rows = tableRows(s["Form"]).filter((r) => r.length >= 3 && r[0]!.toLowerCase() !== "focus");
    const forms = rows.map((r) => r[1]!);
    rows.slice(0, 4).forEach((r, i) => {
      const q = mcq(`f${i}`, `Which form matches this example?  “${r[2]}”`, r[1]!, forms);
      if (q) qs.push(q);
    });
    bullets(s["Quick Recap"]).slice(0, 3).forEach((line, i) => {
      qs.push({ id: `r${i}`, type: "truefalse", prompt: `True or false? ${line}`, answer: "true", points: 1 });
    });
  }

  // 4) Pronunciation -> drills as written answers
  if (contentType === "pronunciation") {
    [...numbered(s["Practice questions"]).values()].forEach((prompt, i) => {
      qs.push({ id: `p${i}`, type: "text", prompt, points: 2 });
    });
  }

  // 5) Speaking -> choose a useful phrase + open answers
  if (contentType === "speaking") {
    [...numbered(s["Talk about it"]).values()].slice(0, 5).forEach((prompt, i) => {
      qs.push({ id: `t${i}`, type: "text", prompt, points: 2 });
    });
  }

  return qs;
}

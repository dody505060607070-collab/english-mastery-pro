import { InteractiveText, SpeakButton } from "@/components/InteractiveText";
import { RichText } from "@/lib/richtext";
import { cn } from "@/lib/utils";
import { BookText, Lightbulb, ListChecks, AlertTriangle, Table2, Sparkles } from "lucide-react";

type Block =
  | { kind: "para"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "table"; rows: string[][] }
  | { kind: "examples"; items: { sign: "+" | "-" | "?"; text: string }[] }
  | { kind: "mistakes"; items: { wrong: string; right: string | null }[] };

type Section = { title: string; blocks: Block[] };

type Tone = {
  head: string;
  ring: string;
  wash: string;
  text: string;
};

const TONES: Record<string, Tone> = {
  primary: {
    head: "bg-primary/15 border-primary/30",
    ring: "border-primary/30",
    wash: "from-primary/[0.10]",
    text: "text-primary",
  },
  amber: {
    head: "bg-amber-500/15 border-amber-500/30",
    ring: "border-amber-500/30",
    wash: "from-amber-500/[0.10]",
    text: "text-amber-600",
  },
  sky: {
    head: "bg-sky-500/15 border-sky-500/30",
    ring: "border-sky-500/30",
    wash: "from-sky-500/[0.10]",
    text: "text-sky-600",
  },
  emerald: {
    head: "bg-emerald-500/15 border-emerald-500/30",
    ring: "border-emerald-500/30",
    wash: "from-emerald-500/[0.10]",
    text: "text-emerald-600",
  },
  rose: {
    head: "bg-rose-500/15 border-rose-500/30",
    ring: "border-rose-500/30",
    wash: "from-rose-500/[0.10]",
    text: "text-rose-600",
  },
  violet: {
    head: "bg-violet-500/15 border-violet-500/30",
    ring: "border-violet-500/30",
    wash: "from-violet-500/[0.10]",
    text: "text-violet-600",
  },
};

const ICONS: { match: RegExp; icon: typeof BookText; tone: keyof typeof TONES }[] = [
  { match: /(learn|objective|goal|why|important|هدف|لماذا|قبل)/i, icon: Lightbulb, tone: "amber" },
  { match: /(form|structure|rule|table|قاعدة|الصيغة|التكوين)/i, icon: Table2, tone: "sky" },
  { match: /(example|أمثلة|نموذج)/i, icon: Sparkles, tone: "emerald" },
  { match: /(mistake|error|avoid|أخطاء|تجنب)/i, icon: AlertTriangle, tone: "rose" },
  { match: /(practice|drill|exercise|task|question|تدريب|أسئلة|مهام|تمرين)/i, icon: ListChecks, tone: "violet" },
];

function sectionStyle(title: string) {
  const hit = ICONS.find((i) => i.match.test(title));
  return { icon: hit?.icon ?? BookText, tone: TONES[hit?.tone ?? "primary"]! };
}

/** True when the text is mainly Arabic, so it should be read right-to-left. */
export function isRtlText(text: string) {
  const ar = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const en = (text.match(/[A-Za-z]/g) ?? []).length;
  return ar > en;
}

/** Parses plain / lightly-marked lesson text into readable sections. */
export function parseGrammar(body: string): Section[] {
  const lines = body.replace(/\r/g, "").split("\n");
  const sections: Section[] = [];
  let current: Section = { title: "", blocks: [] };
  let buffer: string[] = [];

  const flushPara = () => {
    const text = buffer.join(" ").trim();
    buffer = [];
    if (text) current.blocks.push({ kind: "para", text });
  };
  const pushSection = () => {
    flushPara();
    if (current.title || current.blocks.length) sections.push(current);
    current = { title: "", blocks: [] };
  };
  const lastBlock = () => current.blocks[current.blocks.length - 1];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      continue;
    }
    const heading = line.match(/^#{1,4}\s*(.+)$/) || line.match(/^\*\*(.+)\*\*:?$/) || line.match(/^(.{2,40}):$/);
    if (heading && !line.startsWith("|")) {
      pushSection();
      current.title = heading[1]!.replace(/[:*]+$/, "").trim();
      continue;
    }
    if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^-{2,}$/.test(c))) continue;
      flushPara();
      const prev = lastBlock();
      if (prev && prev.kind === "table") prev.rows.push(cells);
      else current.blocks.push({ kind: "table", rows: [cells] });
      continue;
    }
    const ex = line.match(/^([+\-?])\s+(.*)$/);
    if (ex && (ex[1] === "+" || ex[1] === "?" || /(positive|negative|question)/i.test(ex[2]!))) {
      flushPara();
      const prev = lastBlock();
      const item = { sign: ex[1] as "+" | "-" | "?", text: ex[2]!.trim() };
      if (prev && prev.kind === "examples") prev.items.push(item);
      else current.blocks.push({ kind: "examples", items: [item] });
      continue;
    }
    const wrong = line.match(/^(?:~~(.+?)~~|✗\s*(.+?))(?:\s*(?:->|→|✓)\s*(.+))?$/);
    if (wrong) {
      flushPara();
      const prev = lastBlock();
      const item = { wrong: (wrong[1] ?? wrong[2] ?? "").trim(), right: wrong[3]?.trim() ?? null };
      if (prev && prev.kind === "mistakes") prev.items.push(item);
      else current.blocks.push({ kind: "mistakes", items: [item] });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      flushPara();
      const prev = lastBlock();
      if (prev && prev.kind === "bullets") prev.items.push(bullet[1]!);
      else current.blocks.push({ kind: "bullets", items: [bullet[1]!] });
      continue;
    }
    buffer.push(line);
  }
  pushSection();
  return sections.filter((s) => s.title || s.blocks.length);
}

function BlockView({ block, tone }: { block: Block; tone: Tone }) {
  if (block.kind === "para")
    return (
      <div dir={isRtlText(block.text) ? "rtl" : "ltr"} className={isRtlText(block.text) ? "text-right" : "text-left"}>
        <InteractiveText text={block.text} className="text-[15px] leading-8 text-foreground/90 break-words" />
      </div>
    );

  if (block.kind === "bullets") {
    const long = block.items.some((it) => it.length > 70);
    return (
      <ul className={cn("grid gap-2", long ? "grid-cols-1" : "sm:grid-cols-2")}>
        {block.items.map((it, i) => {
          const rtl = isRtlText(it);
          return (
            <li
              key={i}
              dir={rtl ? "rtl" : "ltr"}
              className={cn(
                "flex min-w-0 gap-2.5 rounded-xl border bg-card/70 px-3 py-2 text-sm leading-7",
                tone.ring,
                rtl ? "text-right" : "text-left",
              )}
            >
              <span
                className={cn(
                  "mt-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-black",
                  tone.text,
                )}
              >
                {i + 1}
              </span>
              <InteractiveText text={it} className="min-w-0 text-sm leading-7 text-foreground/90 break-words" />
            </li>
          );
        })}
      </ul>
    );
  }


  if (block.kind === "table")
    return (
      <div className="overflow-x-auto rounded-2xl border border-primary/30 shadow-sm">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-primary/20 last:border-0">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={cn(
                      "px-3 py-2.5 align-middle",
                      ci === 0
                        ? "w-32 border-r border-primary/20 bg-primary/20 text-[13px] font-black text-primary"
                        : ri % 2
                          ? "bg-primary/[0.08]"
                          : "bg-card",
                      ci === 1 && "font-mono text-[13px] text-muted-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <RichText text={cell} />
                      {ci > 0 && ci === row.length - 1 && cell.length > 3 && <SpeakButton text={cell} />}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  if (block.kind === "examples")
    return (
      <div className="grid gap-2">
        {block.items.map((it, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-2.5 shadow-sm"
          >
            <span
              className={cn(
                "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-black",
                it.sign === "+" && "bg-emerald-500/20 text-emerald-600",
                it.sign === "-" && "bg-rose-500/20 text-rose-600",
                it.sign === "?" && "bg-primary/20 text-primary",
              )}
            >
              {it.sign}
            </span>
            <InteractiveText
              text={it.text}
              className="min-w-0 flex-1 text-[15px] leading-7 text-foreground/90 break-words"
            />
            <span className="shrink-0">
              <SpeakButton text={it.text} />
            </span>

          </div>
        ))}
      </div>
    );

  return (
    <div className="grid gap-2">
      {block.items.map((it, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-primary/25 bg-card shadow-sm">
          <p className="flex items-center gap-2 border-b border-primary/20 bg-rose-500/[0.10] px-3 py-2 text-sm font-bold text-rose-600 line-through">
            <RichText text={it.wrong} />
          </p>
          {it.right && (
            <p className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-emerald-600">
              <span className="text-xs">✓</span>
              <RichText text={it.right} />
              <SpeakButton text={it.right} />
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function GrammarLesson({ body }: { body: string }) {
  const sections = parseGrammar(body);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  if (!sections.length) return null;

  return (
    <div className="space-y-3">
      {sections.map((s, i) => {
        const style = sectionStyle(s.title);
        const Icon = style.icon;
        const tone = style.tone;
        const rtlTitle = isRtlText(s.title);
        const collapsible = !!s.title && sections.length > 1;
        const isOpen = collapsible ? (open[i] ?? i === 0) : true;
        return (
          <section
            key={i}
            className={cn(
              "overflow-hidden rounded-3xl border bg-gradient-to-b to-transparent shadow-sm transition-shadow hover:shadow-md",
              tone.ring,
              tone.wash,
            )}
          >
            {s.title && (
              <button
                type="button"
                dir={rtlTitle ? "rtl" : "ltr"}
                onClick={() => collapsible && setOpen((p) => ({ ...p, [i]: !isOpen }))}
                className={cn(
                  "flex w-full items-center gap-2.5 border-b px-4 py-3 text-start",
                  tone.head,
                  collapsible && "cursor-pointer",
                )}
              >
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card shadow-sm", tone.text)}>
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className={cn("min-w-0 flex-1 text-[15px] font-black leading-6 tracking-tight", tone.text)}>
                  {s.title}
                </h3>
                <span className={cn("rounded-full bg-card/80 px-2 py-0.5 text-[10px] font-black opacity-80", tone.text)}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {collapsible && (
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 transition-transform", tone.text, isOpen && "rotate-180")}
                  />
                )}
              </button>
            )}
            {isOpen && (
              <div className="space-y-3.5 bg-card/80 p-4 md:p-5">
                {s.blocks.map((b, bi) => (
                  <BlockView key={bi} block={b} tone={tone} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}



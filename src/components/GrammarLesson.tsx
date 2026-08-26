import { InteractiveText, SpeakButton } from "@/components/InteractiveText";
import { cn } from "@/lib/utils";
import { BookText, Lightbulb, ListChecks, AlertTriangle, Table2, Sparkles } from "lucide-react";

type Block =
  | { kind: "para"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "table"; rows: string[][] }
  | { kind: "examples"; items: { sign: "+" | "-" | "?"; text: string }[] }
  | { kind: "mistakes"; items: { wrong: string; right: string | null }[] };

type Section = { title: string; blocks: Block[] };

const TONE = "bg-primary/20 text-primary border-primary/35";

const ICONS: { match: RegExp; icon: typeof BookText; tone: string }[] = [
  { match: /(learn|objective|goal|هدف)/i, icon: Lightbulb, tone: TONE },
  { match: /(form|structure|rule|قاعدة)/i, icon: Table2, tone: TONE },
  { match: /(example|أمثلة)/i, icon: Sparkles, tone: TONE },
  { match: /(mistake|error|أخطاء)/i, icon: AlertTriangle, tone: TONE },
  { match: /(practice|drill|exercise|تدريب)/i, icon: ListChecks, tone: TONE },
];

function sectionStyle(title: string) {
  const hit = ICONS.find((i) => i.match.test(title));
  return hit ?? { icon: BookText, tone: TONE, match: /./ };
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

function BlockView({ block }: { block: Block }) {
  if (block.kind === "para")
    return <InteractiveText text={block.text} className="text-[15px] leading-8 text-foreground/90" />;

  if (block.kind === "bullets")
    return (
      <ul className="grid gap-2 sm:grid-cols-2">
        {block.items.map((it, i) => (
          <li
            key={i}
            className="flex gap-2.5 rounded-xl border border-primary/25 bg-primary/[0.10] px-3 py-2 text-sm leading-7"
          >
            <span className="mt-2 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/25 text-[10px] font-black text-primary">
              {i + 1}
            </span>
            <InteractiveText text={it} className="text-sm text-foreground/90" />
          </li>
        ))}
      </ul>
    );

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
            <InteractiveText text={it.text} className="text-[15px] leading-7 text-foreground/90" />
            <SpeakButton text={it.text} />
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
  if (!sections.length) return null;

  return (
    <div className="space-y-4">
      {sections.map((s, i) => {
        const style = sectionStyle(s.title);
        const Icon = style.icon;
        return (
          <section
            key={i}
            className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/[0.15] to-transparent shadow-sm transition-shadow hover:shadow-md"
          >
            {s.title && (
              <header className="flex items-center gap-2.5 border-b border-primary/30 bg-primary/20 px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="truncate text-base font-black tracking-tight text-primary">{s.title}</h3>
                <span className="ml-auto rounded-full bg-card/80 px-2 py-0.5 text-[10px] font-black text-primary/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </header>
            )}
            <div className="space-y-3.5 bg-card/80 p-4 md:p-5">
              {s.blocks.map((b, bi) => (
                <BlockView key={bi} block={b} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}


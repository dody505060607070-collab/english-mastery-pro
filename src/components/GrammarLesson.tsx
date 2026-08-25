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

const ICONS: { match: RegExp; icon: typeof BookText; tone: string }[] = [
  { match: /(learn|objective|goal|هدف)/i, icon: Lightbulb, tone: "bg-sky-500/10 text-sky-600 border-sky-500/25" },
  { match: /(form|structure|rule|قاعدة)/i, icon: Table2, tone: "bg-amber-500/10 text-amber-600 border-amber-500/25" },
  { match: /(example|أمثلة)/i, icon: Sparkles, tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25" },
  { match: /(mistake|error|أخطاء)/i, icon: AlertTriangle, tone: "bg-rose-500/10 text-rose-600 border-rose-500/25" },
  { match: /(practice|drill|exercise|تدريب)/i, icon: ListChecks, tone: "bg-violet-500/10 text-violet-600 border-violet-500/25" },
];

function sectionStyle(title: string) {
  const hit = ICONS.find((i) => i.match.test(title));
  return hit ?? { icon: BookText, tone: "bg-primary/10 text-primary border-primary/25", match: /./ };
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
    return <InteractiveText text={block.text} className="text-sm leading-8 text-foreground/90" />;

  if (block.kind === "bullets")
    return (
      <ul className="space-y-1.5">
        {block.items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-7">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <InteractiveText text={it} className="text-sm text-foreground/90" />
          </li>
        ))}
      </ul>
    );

  if (block.kind === "table")
    return (
      <div className="overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className={cn("border-b last:border-0", ri % 2 ? "bg-muted/20" : "bg-background")}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={cn(
                      "px-3 py-2 align-middle",
                      ci === 0 && "w-36 bg-muted/40 font-black",
                      ci === 1 && "font-mono text-[13px] text-muted-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {cell}
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
      <div className="space-y-1.5">
        {block.items.map((it, i) => (
          <div key={i} className="flex items-start gap-2">
            <span
              className={cn(
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-xs font-black",
                it.sign === "+" && "bg-emerald-500/15 text-emerald-600",
                it.sign === "-" && "bg-rose-500/15 text-rose-600",
                it.sign === "?" && "bg-sky-500/15 text-sky-600",
              )}
            >
              {it.sign}
            </span>
            <InteractiveText text={it.text} className="text-sm leading-7 text-foreground/90" />
          </div>
        ))}
      </div>
    );

  return (
    <div className="space-y-2">
      {block.items.map((it, i) => (
        <div key={i} className="rounded-xl border border-rose-500/25 bg-rose-500/5 px-3 py-2">
          <p className="text-sm font-bold text-rose-600 line-through">{it.wrong}</p>
          {it.right && <p className="text-sm font-bold text-emerald-600">{it.right}</p>}
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
          <section key={i} className="overflow-hidden rounded-2xl border bg-card">
            {s.title && (
              <header className={cn("flex items-center gap-2 border-b px-4 py-2.5", style.tone)}>
                <Icon className="h-4 w-4 shrink-0" />
                <h3 className="truncate text-sm font-black">{s.title}</h3>
              </header>
            )}
            <div className="space-y-3 p-4">
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

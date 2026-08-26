import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight inline formatting used inside lesson text (grammar, vocab, notes).
 *
 *  **bold**              -> bold
 *  *italic*              -> italic
 *  __underline__         -> underline
 *  ==text==              -> yellow highlighter
 *  ==blue|text==         -> colored highlighter (blue/green/pink/red/yellow/purple/orange)
 *  !!red|text!!          -> colored text
 *  `code`                -> mono chip
 */

const HIGHLIGHT: Record<string, string> = {
  yellow: "bg-yellow-300/60 text-foreground",
  blue: "bg-primary/25 text-primary",
  green: "bg-emerald-400/40 text-emerald-900 dark:text-emerald-100",
  pink: "bg-pink-400/40 text-pink-900 dark:text-pink-100",
  red: "bg-rose-400/40 text-rose-900 dark:text-rose-100",
  purple: "bg-violet-400/40 text-violet-900 dark:text-violet-100",
  orange: "bg-orange-400/45 text-orange-900 dark:text-orange-100",
};

const TEXT_COLOR: Record<string, string> = {
  blue: "text-primary",
  green: "text-emerald-600",
  red: "text-rose-600",
  pink: "text-pink-600",
  purple: "text-violet-600",
  orange: "text-orange-600",
  yellow: "text-yellow-600",
};

const TOKEN = /(\*\*[^*\n]+\*\*|__[^_\n]+__|==[^=\n]+==|!![^!\n]+!!|`[^`\n]+`|\*[^*\n]+\*)/g;

function split(raw: string) {
  const at = raw.indexOf("|");
  if (at > 0 && at < 10) return { key: raw.slice(0, at).trim().toLowerCase(), text: raw.slice(at + 1) };
  return { key: "", text: raw };
}

export type InlinePart = { text: string; className?: string };

/** Splits text into styled parts based on the inline markup above. */
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ text: text.slice(last, i) });
    const tok = m[0];
    if (tok.startsWith("**")) parts.push({ text: tok.slice(2, -2), className: "font-black" });
    else if (tok.startsWith("__")) parts.push({ text: tok.slice(2, -2), className: "underline decoration-2 underline-offset-2" });
    else if (tok.startsWith("==")) {
      const { key, text: t } = split(tok.slice(2, -2));
      parts.push({
        text: t,
        className: cn("rounded px-1 font-bold", HIGHLIGHT[key] ?? HIGHLIGHT["yellow"]),
      });
    } else if (tok.startsWith("!!")) {
      const { key, text: t } = split(tok.slice(2, -2));
      parts.push({ text: t, className: cn("font-bold", TEXT_COLOR[key] ?? "text-primary") });
    } else if (tok.startsWith("`"))
      parts.push({
        text: tok.slice(1, -1),
        className: "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]",
      });
    else parts.push({ text: tok.slice(1, -1), className: "italic" });
    last = i + tok.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** Renders inline markup without word-level interactivity. */
export function RichText({ text, className }: { text: string; className?: string }): ReactNode {
  return (
    <span className={className}>
      {parseInline(text).map((p, i) => (
        <span key={i} className={p.className}>
          {p.text}
        </span>
      ))}
    </span>
  );
}

import { useEffect, useState } from "react";

/**
 * Student-owned word highlights (stored locally on the student's device).
 * A highlight is keyed by the lowercase word, so once a student highlights
 * a word it stays highlighted everywhere: grammar, reading, vocabulary…
 */
export type HighlightColor = "yellow" | "blue" | "green" | "pink" | "orange";

export const HIGHLIGHT_CLASSES: Record<HighlightColor, string> = {
  yellow: "bg-amber-300/70 text-amber-950 dark:text-amber-100 dark:bg-amber-500/40 rounded px-0.5",
  blue: "bg-primary/25 text-primary rounded px-0.5",
  green: "bg-emerald-400/40 text-emerald-950 dark:text-emerald-100 rounded px-0.5",
  pink: "bg-pink-400/40 text-pink-950 dark:text-pink-100 rounded px-0.5",
  orange: "bg-orange-400/40 text-orange-950 dark:text-orange-100 rounded px-0.5",
};

export const HIGHLIGHT_SWATCHES: Record<HighlightColor, string> = {
  yellow: "bg-amber-400",
  blue: "bg-primary",
  green: "bg-emerald-500",
  pink: "bg-pink-500",
  orange: "bg-orange-500",
};

const KEY = "bl-word-highlights";
let map: Record<string, HighlightColor> = {};
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    map = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
  } catch {
    map = {};
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function setHighlight(word: string, color: HighlightColor | null) {
  load();
  const k = word.toLowerCase();
  if (color) map[k] = color;
  else delete map[k];
  persist();
}

export function getHighlight(word: string): HighlightColor | null {
  load();
  return map[word.toLowerCase()] ?? null;
}

/** Reactive read of the highlight color for one word. */
export function useHighlight(word: string): HighlightColor | null {
  const [color, setColor] = useState<HighlightColor | null>(null);
  useEffect(() => {
    const sync = () => setColor(getHighlight(word));
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [word]);
  return color;
}

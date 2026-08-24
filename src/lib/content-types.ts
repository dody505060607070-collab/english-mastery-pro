import {
  BookText,
  Video,
  FileText,
  Headphones,
  PenLine,
  ClipboardList,
  Sparkles,
  BookOpenCheck,
  Target,
  type LucideIcon,
} from "lucide-react";

export const CONTENT_TYPES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "grammar", label: "Grammar", icon: BookText },
  { value: "vocabulary", label: "Vocabulary", icon: Sparkles },
  { value: "video", label: "Video", icon: Video },
  { value: "listening", label: "Listening", icon: Headphones },
  { value: "reading", label: "Reading", icon: BookOpenCheck },
  { value: "writing", label: "Writing", icon: PenLine },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "practice", label: "Practice", icon: Target },
  { value: "task", label: "Task / Homework", icon: ClipboardList },
  { value: "test", label: "Test", icon: ClipboardList },
];

export function contentMeta(type: string) {
  return (
    CONTENT_TYPES.find((t) => t.value === type) ?? { value: type, label: type, icon: FileText as LucideIcon }
  );
}

/** Soft accent styles per content type — keeps every section visually distinct. */
export const CONTENT_COLORS: Record<string, { tile: string; soft: string; bar: string }> = {
  reading: { tile: "bg-sky-500/12 text-sky-600", soft: "bg-sky-500/10 text-sky-700 border-sky-500/25", bar: "bg-sky-500" },
  listening: { tile: "bg-violet-500/12 text-violet-600", soft: "bg-violet-500/10 text-violet-700 border-violet-500/25", bar: "bg-violet-500" },
  grammar: { tile: "bg-amber-500/12 text-amber-600", soft: "bg-amber-500/10 text-amber-700 border-amber-500/25", bar: "bg-amber-500" },
  vocabulary: { tile: "bg-emerald-500/12 text-emerald-600", soft: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25", bar: "bg-emerald-500" },
  practice: { tile: "bg-pink-500/12 text-pink-600", soft: "bg-pink-500/10 text-pink-700 border-pink-500/25", bar: "bg-pink-500" },
  task: { tile: "bg-orange-500/12 text-orange-600", soft: "bg-orange-500/10 text-orange-700 border-orange-500/25", bar: "bg-orange-500" },
  test: { tile: "bg-rose-500/12 text-rose-600", soft: "bg-rose-500/10 text-rose-700 border-rose-500/25", bar: "bg-rose-500" },
  video: { tile: "bg-indigo-500/12 text-indigo-600", soft: "bg-indigo-500/10 text-indigo-700 border-indigo-500/25", bar: "bg-indigo-500" },
  writing: { tile: "bg-teal-500/12 text-teal-600", soft: "bg-teal-500/10 text-teal-700 border-teal-500/25", bar: "bg-teal-500" },
  pdf: { tile: "bg-slate-500/12 text-slate-600", soft: "bg-slate-500/10 text-slate-700 border-slate-500/25", bar: "bg-slate-500" },
};

export function contentColor(type: string) {
  return (
    CONTENT_COLORS[type] ?? {
      tile: "bg-primary/10 text-primary",
      soft: "bg-primary/10 text-primary border-primary/25",
      bar: "bg-primary",
    }
  );
}

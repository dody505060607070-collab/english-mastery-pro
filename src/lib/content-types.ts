import {
  BookText,
  Video,
  FileText,
  Headphones,
  PenLine,
  ClipboardList,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const CONTENT_TYPES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "grammar", label: "Grammar", icon: BookText },
  { value: "vocabulary", label: "Vocabulary", icon: Sparkles },
  { value: "video", label: "Video", icon: Video },
  { value: "listening", label: "Listening", icon: Headphones },
  { value: "reading", label: "Reading", icon: FileText },
  { value: "writing", label: "Writing", icon: PenLine },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "practice", label: "Practice", icon: PenLine },
  { value: "task", label: "Task / Homework", icon: ClipboardList },
  { value: "test", label: "Test", icon: ClipboardList },
];

export function contentMeta(type: string) {
  return (
    CONTENT_TYPES.find((t) => t.value === type) ?? { value: type, label: type, icon: FileText as LucideIcon }
  );
}

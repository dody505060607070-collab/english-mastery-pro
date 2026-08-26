import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, Highlighter, Palette, Code, Eye, EyeOff } from "lucide-react";
import { GrammarLesson } from "@/components/GrammarLesson";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
  { key: "yellow", swatch: "bg-yellow-300" },
  { key: "blue", swatch: "bg-primary" },
  { key: "green", swatch: "bg-emerald-500" },
  { key: "pink", swatch: "bg-pink-500" },
  { key: "orange", swatch: "bg-orange-500" },
];

const COLORS = [
  { key: "blue", swatch: "text-primary" },
  { key: "red", swatch: "text-rose-600" },
  { key: "green", swatch: "text-emerald-600" },
  { key: "purple", swatch: "text-violet-600" },
];

/**
 * Textarea with a formatting toolbar (bold / italic / underline / highlighter /
 * text color / code) plus a live preview of how students will see the lesson.
 */
export function FormattedTextarea({
  value,
  onChange,
  rows = 10,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const wrap = (before: string, after: string, fallback = "text") => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = value.slice(start, end) || fallback;
    const next = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + sel.length);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-muted/40 p-1.5">
        <ToolBtn label="Bold" onClick={() => wrap("**", "**")}>
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn label="Italic" onClick={() => wrap("*", "*")}>
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn label="Underline" onClick={() => wrap("__", "__")}>
          <Underline className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn label="Code" onClick={() => wrap("`", "`")}>
          <Code className="h-4 w-4" />
        </ToolBtn>

        <span className="mx-1 h-5 w-px bg-border" />
        <Highlighter className="h-4 w-4 text-muted-foreground" />
        {HIGHLIGHTS.map((h) => (
          <button
            key={h.key}
            type="button"
            title={`Highlight ${h.key}`}
            onClick={() => wrap(h.key === "yellow" ? "==" : `==${h.key}|`, "==")}
            className={cn("h-5 w-5 rounded-md border border-black/10", h.swatch)}
          />
        ))}

        <span className="mx-1 h-5 w-px bg-border" />
        <Palette className="h-4 w-4 text-muted-foreground" />
        {COLORS.map((c) => (
          <button
            key={c.key}
            type="button"
            title={`Text color ${c.key}`}
            onClick={() => wrap(`!!${c.key}|`, "!!")}
            className={cn("grid h-5 w-5 place-items-center rounded-md border text-[11px] font-black", c.swatch)}
          >
            A
          </button>
        ))}

        <Button
          type="button"
          size="sm"
          variant={preview ? "default" : "outline"}
          className="ml-auto h-7"
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="ml-1 text-xs">Preview</span>
        </Button>
      </div>

      <Textarea
        ref={ref}
        dir="ltr"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-[13px]"
      />
      <p className="text-[11px] leading-5 text-muted-foreground">
        Formatting: <code>**bold**</code> · <code>*italic*</code> · <code>__underline__</code> ·{" "}
        <code>==highlight==</code> · <code>==blue|highlight==</code> · <code>!!red|colored!!</code> ·{" "}
        <code>`code`</code>. Headings: <code>## Title</code>. Table rows: <code>| a | b |</code>. Examples:{" "}
        <code>+ / - / ?</code>. Mistakes: <code>~~wrong~~ → right</code>.
      </p>

      {preview && (
        <div className="rounded-2xl border bg-background p-3">
          <p className="mb-2 text-xs font-black text-muted-foreground">Student preview</p>
          <GrammarLesson body={value} />
        </div>
      )}
    </div>
  );
}

function ToolBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md border bg-card text-foreground/80 hover:bg-primary/10 hover:text-primary"
    >
      {children}
    </button>
  );
}

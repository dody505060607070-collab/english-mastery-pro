import { useMemo, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Table2, ListChecks, Sparkles, AlertTriangle, Type } from "lucide-react";

import { parseGrammar } from "@/components/GrammarLesson";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Block =
  | { kind: "para"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "steps"; items: string[] }
  | { kind: "table"; rows: string[][] }
  | { kind: "examples"; items: { sign: "+" | "-" | "?"; text: string }[] }
  | { kind: "mistakes"; items: { wrong: string; right: string | null }[] };

type Section = { title: string; blocks: Block[] };

/** Turns the edited sections back into the lesson markup the student view renders. */
export function serializeLesson(sections: Section[]): string {
  const out: string[] = [];
  for (const s of sections) {
    if (s.title.trim()) out.push(`## ${s.title.trim()}`);
    for (const b of s.blocks) {
      if (b.kind === "para") out.push(b.text.trim());
      else if (b.kind === "bullets") out.push(b.items.filter(Boolean).map((i) => `* ${i}`).join("\n"));
      else if (b.kind === "steps") out.push(b.items.filter(Boolean).map((i, n) => `${n + 1}. ${i}`).join("\n"));
      else if (b.kind === "table")
        out.push(b.rows.map((r) => `| ${r.map((c) => c.trim()).join(" | ")} |`).join("\n"));
      else if (b.kind === "examples")
        out.push(b.items.filter((i) => i.text.trim()).map((i) => `${i.sign} ${i.text.trim()}`).join("\n"));
      else if (b.kind === "mistakes")
        out.push(
          b.items
            .filter((i) => i.wrong.trim())
            .map((i) => `~~${i.wrong.trim()}~~${i.right ? ` → ${i.right.trim()}` : ""}`)
            .join("\n"),
        );
      out.push("");
    }
    out.push("");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

const BLOCK_META: Record<Block["kind"], { label: string; icon: typeof Type }> = {
  para: { label: "Paragraph", icon: Type },
  bullets: { label: "Bullet list", icon: ListChecks },
  steps: { label: "Numbered steps", icon: ListChecks },
  table: { label: "Table", icon: Table2 },
  examples: { label: "Examples (+ / − / ?)", icon: Sparkles },
  mistakes: { label: "Common mistakes", icon: AlertTriangle },
};

function newBlock(kind: Block["kind"]): Block {
  if (kind === "para") return { kind, text: "" };
  if (kind === "bullets" || kind === "steps") return { kind, items: [""] } as Block;
  if (kind === "table") return { kind, rows: [["Focus", "Form", "Example"], ["", "", ""]] };
  if (kind === "examples") return { kind, items: [{ sign: "+", text: "" }] };
  return { kind: "mistakes", items: [{ wrong: "", right: "" }] };
}

/**
 * Visual (no-markup) editor for lesson text: edit the same blocks students see —
 * sections, paragraphs, tables, positive/negative/question examples and mistakes.
 */
export function VisualLessonEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const initial = useMemo(() => parseGrammar(value || "") as Section[], []);
  const [sections, setSections] = useState<Section[]>(initial.length ? initial : [{ title: "", blocks: [] }]);

  const commit = (next: Section[]) => {
    setSections(next);
    onChange(serializeLesson(next));
  };
  const patchSection = (si: number, fn: (s: Section) => Section) =>
    commit(sections.map((s, i) => (i === si ? fn(s) : s)));
  const patchBlock = (si: number, bi: number, b: Block) =>
    patchSection(si, (s) => ({ ...s, blocks: s.blocks.map((x, i) => (i === bi ? b : x)) }));

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <div key={si} className="rounded-2xl border border-primary/25 bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={section.title}
              placeholder="Section title (e.g. Form, Examples, Common mistakes)"
              onChange={(e) => patchSection(si, (s) => ({ ...s, title: e.target.value }))}
              className="font-bold"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => commit(sections.filter((_, i) => i !== si))}
              aria-label="Delete section"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          {section.blocks.map((block, bi) => {
            const Meta = BLOCK_META[block.kind];
            return (
              <div key={bi} className="rounded-xl border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Meta.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black">{Meta.label}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={bi === 0}
                      aria-label="Move up"
                      onClick={() =>
                        patchSection(si, (s) => {
                          const b = [...s.blocks];
                          [b[bi - 1], b[bi]] = [b[bi]!, b[bi - 1]!];
                          return { ...s, blocks: b };
                        })
                      }
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={bi === section.blocks.length - 1}
                      aria-label="Move down"
                      onClick={() =>
                        patchSection(si, (s) => {
                          const b = [...s.blocks];
                          [b[bi], b[bi + 1]] = [b[bi + 1]!, b[bi]!];
                          return { ...s, blocks: b };
                        })
                      }
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Delete block"
                      onClick={() => patchSection(si, (s) => ({ ...s, blocks: s.blocks.filter((_, i) => i !== bi) }))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {block.kind === "para" && (
                  <Textarea
                    dir="auto"
                    rows={3}
                    value={block.text}
                    onChange={(e) => patchBlock(si, bi, { kind: "para", text: e.target.value })}
                  />
                )}

                {(block.kind === "bullets" || block.kind === "steps") && (
                  <div className="space-y-2">
                    {block.items.map((it, ii) => (
                      <div key={ii} className="flex gap-2">
                        <Input
                          dir="auto"
                          value={it}
                          onChange={(e) =>
                            patchBlock(si, bi, {
                              ...block,
                              items: block.items.map((x, i) => (i === ii ? e.target.value : x)),
                            } as Block)
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete line"
                          onClick={() =>
                            patchBlock(si, bi, { ...block, items: block.items.filter((_, i) => i !== ii) } as Block)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => patchBlock(si, bi, { ...block, items: [...block.items, ""] } as Block)}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add line
                    </Button>
                  </div>
                )}

                {block.kind === "table" && (
                  <div className="space-y-2 overflow-x-auto">
                    {block.rows.map((row, ri) => (
                      <div key={ri} className="flex gap-2">
                        {row.map((cell, ci) => (
                          <Input
                            key={ci}
                            dir="auto"
                            value={cell}
                            className={ri === 0 ? "font-bold" : ""}
                            onChange={(e) =>
                              patchBlock(si, bi, {
                                kind: "table",
                                rows: block.rows.map((r, i) =>
                                  i === ri ? r.map((c, j) => (j === ci ? e.target.value : c)) : r,
                                ),
                              })
                            }
                          />
                        ))}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete row"
                          onClick={() =>
                            patchBlock(si, bi, { kind: "table", rows: block.rows.filter((_, i) => i !== ri) })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          patchBlock(si, bi, {
                            kind: "table",
                            rows: [...block.rows, (block.rows[0] ?? ["", ""]).map(() => "")],
                          })
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add row
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => patchBlock(si, bi, { kind: "table", rows: block.rows.map((r) => [...r, ""]) })}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add column
                      </Button>
                    </div>
                  </div>
                )}

                {block.kind === "examples" && (
                  <div className="space-y-2">
                    {block.items.map((it, ii) => (
                      <div key={ii} className="flex gap-2">
                        <Select
                          value={it.sign}
                          onValueChange={(v) =>
                            patchBlock(si, bi, {
                              kind: "examples",
                              items: block.items.map((x, i) =>
                                i === ii ? { ...x, sign: v as "+" | "-" | "?" } : x,
                              ),
                            })
                          }
                        >
                          <SelectTrigger className="w-32 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+">Positive (+)</SelectItem>
                            <SelectItem value="-">Negative (−)</SelectItem>
                            <SelectItem value="?">Question (?)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          dir="auto"
                          value={it.text}
                          onChange={(e) =>
                            patchBlock(si, bi, {
                              kind: "examples",
                              items: block.items.map((x, i) => (i === ii ? { ...x, text: e.target.value } : x)),
                            })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete example"
                          onClick={() =>
                            patchBlock(si, bi, { kind: "examples", items: block.items.filter((_, i) => i !== ii) })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      {(["+", "-", "?"] as const).map((sign) => (
                        <Button
                          key={sign}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            patchBlock(si, bi, { kind: "examples", items: [...block.items, { sign, text: "" }] })
                          }
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {sign === "+" ? "Positive" : sign === "-" ? "Negative" : "Question"}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {block.kind === "mistakes" && (
                  <div className="space-y-2">
                    {block.items.map((it, ii) => (
                      <div key={ii} className="flex gap-2">
                        <Input
                          dir="auto"
                          placeholder="Wrong"
                          value={it.wrong}
                          onChange={(e) =>
                            patchBlock(si, bi, {
                              kind: "mistakes",
                              items: block.items.map((x, i) => (i === ii ? { ...x, wrong: e.target.value } : x)),
                            })
                          }
                        />
                        <Input
                          dir="auto"
                          placeholder="Right"
                          value={it.right ?? ""}
                          onChange={(e) =>
                            patchBlock(si, bi, {
                              kind: "mistakes",
                              items: block.items.map((x, i) => (i === ii ? { ...x, right: e.target.value } : x)),
                            })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete mistake"
                          onClick={() =>
                            patchBlock(si, bi, { kind: "mistakes", items: block.items.filter((_, i) => i !== ii) })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        patchBlock(si, bi, { kind: "mistakes", items: [...block.items, { wrong: "", right: "" }] })
                      }
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add mistake
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs font-bold text-muted-foreground">Add block:</Label>
            {(Object.keys(BLOCK_META) as Block["kind"][]).map((kind) => (
              <Button
                key={kind}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => patchSection(si, (s) => ({ ...s, blocks: [...s.blocks, newBlock(kind)] }))}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {BLOCK_META[kind].label}
              </Button>
            ))}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => commit([...sections, { title: "", blocks: [] }])}
        className="font-bold"
      >
        <Plus className="h-4 w-4 mr-1" /> Add section
      </Button>
    </div>
  );
}

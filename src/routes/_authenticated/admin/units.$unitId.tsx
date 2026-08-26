import { FileUploadField } from "@/components/FileUploadField";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormattedTextarea } from "@/components/FormattedTextarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  listUnitContents,
  saveUnitContent,
  deleteUnitContent,
  reorderUnitContents,
} from "@/lib/admin-manage.functions";
import { CONTENT_TYPES, contentMeta } from "@/lib/content-types";
import { QuestionEditor } from "@/components/exercise/QuestionEditor";
import { VocabAudioButton } from "@/components/exercise/VocabAudioButton";

import type { ExerciseData, VocabWord } from "@/lib/exercise-types";

export const Route = createFileRoute("/_authenticated/admin/units/$unitId")({
  component: UnitContentPage,
});

type ContentRow = Awaited<ReturnType<typeof listUnitContents>>["contents"][number];

function UnitContentPage() {
  const { unitId } = useParams({ from: "/_authenticated/admin/units/$unitId" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<ContentRow> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-unit-contents", unitId],
    queryFn: () => listUnitContents({ data: { unitId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-unit-contents", unitId] });

  const remove = useMutation({
    mutationFn: (id: string) => deleteUnitContent({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: (items: { id: string; order_index: number }[]) => reorderUnitContents({ data: { items } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const contents = data?.contents ?? [];

  function move(index: number, dir: -1 | 1) {
    const next = [...contents];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    const b = next[target]!;
    reorder.mutate([
      { id: a.id, order_index: b.order_index },
      { id: b.id, order_index: a.order_index },
    ]);
  }

  const sectionId = (data?.unit as any)?.section_id as string | undefined;

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {sectionId ? (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/sections/$sectionId" params={{ sectionId }}>
                <ArrowRight className="h-4 w-4 ml-1" />
                Units
              </Link>
            </Button>
          ) : null}
          <div>
            <h1 className="text-xl font-black">{data?.unit?.title ?? "Unit Content"}</h1>
            <p className="text-xs text-muted-foreground">{(data?.unit as any)?.sections?.name}</p>
          </div>
        </div>
        <Button onClick={() => setEditing({ content_type: "grammar", title: "", body: "", is_published: true })}>
          <Plus className="h-4 w-4 ml-2" />
          Content Item
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : contents.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground font-bold">
            No content in this unit yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {contents.map((c, i) => {
            const meta = contentMeta(c.content_type);
            return (
              <Card key={c.id} className="border-border/60">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="bg-primary/10 text-primary p-3 rounded-2xl">
                    <meta.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black truncate">{c.title}</p>
                      <Badge variant="secondary">{meta.label}</Badge>
                      {!c.is_published && <Badge variant="outline">Draft</Badge>}
                    </div>
                    {c.media_url && (
                      <p className="text-xs text-muted-foreground truncate mt-1">{c.media_url}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => move(i, 1)}
                      disabled={i === contents.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => setEditing(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Delete this item?")) remove.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <ContentDialog
          content={editing}
          unitId={unitId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function ContentDialog({
  content,
  unitId,
  onClose,
  onSaved,
}: {
  content: Partial<ContentRow>;
  unitId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState(content.content_type ?? "grammar");
  const [title, setTitle] = useState(content.title ?? "");
  const [body, setBody] = useState(content.body ?? "");
  const [mediaUrl, setMediaUrl] = useState(content.media_url ?? "");
  const [published, setPublished] = useState(content.is_published ?? true);
  const [exercise, setExercise] = useState<ExerciseData>(() => {
    const raw = (content as any).data;
    if (!raw) return {};
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as ExerciseData;
      } catch {
        return {};
      }
    }
    return raw as ExerciseData;
  });

  const patch = (p: Partial<ExerciseData>) => setExercise((e) => ({ ...e, ...p }));
  const words = exercise.words ?? [];

  const save = useMutation({
    mutationFn: () =>
      saveUnitContent({
        data: {
          ...(content.id ? { id: content.id } : {}),
          unitId,
          content_type: type,
          title,
          body: body || null,
          media_url: mediaUrl || null,
          data: exercise,
          is_published: published,
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="ltr" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black">{content.id ? "Edit Content" : "New Content"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold">Content Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Explanation / Text</Label>
            <FormattedTextarea value={body} onChange={setBody} rows={10} />
          </div>
          <FileUploadField
            label="Media (video / audio / PDF / image)"
            value={mediaUrl}
            onChange={setMediaUrl}
            bucket="content"
            kind={
              type === "video"
                ? "video"
                : type === "listening"
                  ? "audio"
                  : type === "pdf"
                    ? "pdf"
                    : "any"
            }
            folder={`units/${content.unit_id ?? "misc"}`}
          />

          {type === "listening" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label className="font-bold">Listening Text (Transcript)</Label>
                <Textarea
                  dir="ltr"
                  rows={5}
                  value={exercise.transcript ?? ""}
                  onChange={(e) => patch({ transcript: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Max listen count (optional)</Label>
                <Input
                  type="number"
                  min={1}
                  value={exercise.max_plays ?? ""}
                  onChange={(e) => patch({ max_plays: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>
          )}

          {type === "vocabulary" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-black">Words ({words.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => patch({ words: [...words, { word: "", translation: "", example: "" }] })}
                >
                  <Plus className="h-4 w-4 ml-1" /> Word
                </Button>
              </div>
              {words.map((w: VocabWord, i: number) => (
                <div key={i} className="rounded-2xl border p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      dir="ltr"
                      placeholder="Word"
                      value={w.word}
                      onChange={(e) => {
                        const next = [...words];
                        next[i] = { ...w, word: e.target.value };
                        patch({ words: next });
                      }}
                    />
                    <Input
                      placeholder="Translation"
                      value={w.translation ?? ""}
                      onChange={(e) => {
                        const next = [...words];
                        next[i] = { ...w, translation: e.target.value };
                        patch({ words: next });
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="shrink-0"
                      onClick={() => patch({ words: words.filter((_: VocabWord, j: number) => j !== i) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    dir="ltr"
                    placeholder="Example sentence"
                    value={w.example ?? ""}
                    onChange={(e) => {
                      const next = [...words];
                      next[i] = { ...w, example: e.target.value };
                      patch({ words: next });
                    }}
                  />
                  <Input
                    placeholder="Sentence translation"
                    value={w.example_ar ?? ""}
                    onChange={(e) => {
                      const next = [...words];
                      next[i] = { ...w, example_ar: e.target.value };
                      patch({ words: next });
                    }}
                  />
                  <FileUploadField
                    label="Word image (optional)"
                    value={w.image_url ?? ""}
                    onChange={(v) => {
                      const next = [...words];
                      next[i] = { ...w, image_url: v };
                      patch({ words: next });
                    }}
                    bucket="content"
                    kind="image"
                    folder={`units/${unitId}/vocab`}
                  />
                  <FileUploadField
                    label="Word pronunciation (optional audio)"
                    value={w.word_audio ?? ""}
                    onChange={(v) => {
                      const next = [...words];
                      next[i] = { ...w, word_audio: v };
                      patch({ words: next });
                    }}
                    bucket="content"
                    kind="audio"
                    folder={`units/${unitId}/vocab`}
                  />
                  <FileUploadField
                    label="Sentence pronunciation (optional audio)"
                    value={w.sentence_audio ?? ""}
                    onChange={(v) => {
                      const next = [...words];
                      next[i] = { ...w, sentence_audio: v };
                      patch({ words: next });
                    }}
                    bucket="content"
                    kind="audio"
                    folder={`units/${unitId}/vocab`}
                  />
                  <VocabAudioButton
                    word={w}
                    onGenerated={(p) => {
                      const next = [...words];
                      next[i] = { ...w, ...p };
                      patch({ words: next });
                    }}
                  />

                </div>
              ))}
            </div>
          )}

          {type === "test" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="font-bold">Test duration (minutes)</Label>
                <Input
                  type="number"
                  value={exercise.time_limit_minutes ?? ""}
                  onChange={(e) => patch({ time_limit_minutes: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Passing score %</Label>
                <Input
                  type="number"
                  value={exercise.pass_score ?? ""}
                  onChange={(e) => patch({ pass_score: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Number of attempts</Label>
                <Input
                  type="number"
                  value={exercise.attempts_allowed ?? ""}
                  onChange={(e) => patch({ attempts_allowed: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>
          )}

          {["reading", "listening", "practice", "task", "test", "grammar", "writing"].includes(type) && (
            <QuestionEditor
              questions={exercise.questions ?? []}
              onChange={(questions) => patch({ questions })}
            />
          )}

          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label className="font-bold">Published for students</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !title.trim()}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

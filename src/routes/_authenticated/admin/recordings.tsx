import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Pencil, PlaySquare, Plus, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadField } from "@/components/FileUploadField";
import { LectureRecorder } from "@/components/LectureRecorder";
import { LectureUploadCard } from "@/components/LectureUploadCard";
import {
  listRecordings,
  saveRecording,
  setRecordingPublished,
  deleteRecording,
  listOrphanRecordingFiles,
  adoptRecordingFile,
} from "@/lib/recordings.functions";
import { listSections } from "@/lib/admin-manage.functions";

function OrphanFilesCard({ onAdopted }: { onAdopted: () => void }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["orphan-recording-files"],
    queryFn: () => listOrphanRecordingFiles(),
  });

  const adopt = useMutation({
    mutationFn: (v: { path: string; title: string }) => adoptRecordingFile({ data: v }),
    onSuccess: () => {
      toast.success("Lecture recovered and published");
      refetch();
      onAdopted();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const files = data ?? [];

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="font-black">Uploaded files not linked to a lecture</p>
            <p className="text-xs text-muted-foreground">
              If an old recording is not visible to students, click "Recover" next to the file with its size and time.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
            Refresh
          </Button>
        </div>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : files.length === 0 ? (
          <p className="text-sm font-bold text-muted-foreground">No unlinked files.</p>
        ) : (
          <div className="space-y-2">
            {files.map((f: any) => (
              <div key={f.path} className="flex items-center gap-2 flex-wrap rounded-lg border bg-background p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" dir="ltr">
                    {f.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {(f.size / (1024 * 1024)).toFixed(1)} MB ·{" "}
                    {f.created_at ? new Date(f.created_at).toLocaleString("en-US") : "—"}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="font-black"
                  disabled={adopt.isPending}
                  onClick={() =>
                    adopt.mutate({
                      path: f.path,
                      title: `Lecture ${
                        f.created_at ? new Date(f.created_at).toLocaleDateString("en-US") : f.name
                      }`,
                    })
                  }
                >
                  Recover & Publish
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute("/_authenticated/admin/recordings")({
  component: AdminRecordingsPage,
});

type Draft = {
  id?: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  sectionId: string;
  isPublished: boolean;
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  videoUrl: "",
  thumbnailUrl: "",
  sectionId: "all",
  isPublished: true,
};

function AdminRecordingsPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [watching, setWatching] = useState<string | null>(null);

  const sectionsQuery = useQuery({ queryKey: ["admin-sections"], queryFn: () => listSections() });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-recordings"],
    queryFn: () => listRecordings(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-recordings"] });
    qc.invalidateQueries({ queryKey: ["student-recordings"] });
  };

  const save = useMutation({
    mutationFn: (d: Draft) =>
      saveRecording({
        data: {
          id: d.id,
          title: d.title,
          description: d.description || null,
          videoUrl: d.videoUrl || null,
          thumbnailUrl: d.thumbnailUrl || null,
          sectionId: d.sectionId === "all" ? null : d.sectionId,
          isPublished: d.isPublished,
          status: d.videoUrl ? "ready" : "recording",
        },
      }),
    onSuccess: () => {
      toast.success("Recording saved");
      setDraft(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: (v: { id: string; isPublished: boolean }) => setRecordingPublished({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteRecording({ data: { id } }),
    onSuccess: () => {
      toast.success("Recording deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <PlaySquare className="h-5 w-5 text-primary" /> Record Lecture
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a lecture video from your device, or record your screen from the browser during the live session.
          </p>
        </div>
        <Button onClick={() => setDraft({ ...emptyDraft })} className="gap-2">
          <Plus className="h-4 w-4" /> Add Recording
        </Button>
      </div>

      <LectureUploadCard onSaved={invalidate} />

      <OrphanFilesCard onAdopted={invalidate} />

      <Card className="border-destructive/30">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label>Title of the lecture being recorded</Label>
            <Input
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Live session - Unit 1"
            />
          </div>
          <LectureRecorder title={quickTitle} onSaved={invalidate} />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground font-bold">
            No recordings yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                {r.cover_url ? (
                  <img
                    src={r.cover_url}
                    alt={`Cover for ${r.title}`}
                    loading="lazy"
                    className="h-16 w-28 shrink-0 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="h-16 w-28 shrink-0 rounded-lg border border-dashed grid place-items-center text-[10px] font-bold text-muted-foreground">
                    No cover
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black truncate">{r.title}</p>
                    {r.is_published ? (
                      <Badge className="bg-emerald-600 text-white">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Hidden</Badge>
                    )}
                    {r.sections?.name && <Badge variant="outline">{r.sections.name}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">
                    {r.video_url || "No file yet"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.playback_url && (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1"
                      onClick={() => setWatching(watching === r.id ? null : r.id)}
                    >
                      <PlaySquare className="h-4 w-4" />
                      {watching === r.id ? "Close" : "Watch"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    onClick={() => togglePublish.mutate({ id: r.id, isPublished: !r.is_published })}
                  >
                    {r.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {r.is_published ? "Hide" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft({
                        id: r.id,
                        title: r.title,
                        description: r.description ?? "",
                        videoUrl: r.video_url ?? "",
                        thumbnailUrl: r.thumbnail_url ?? "",
                        sectionId: r.section_id ?? "all",
                        isPublished: r.is_published,
                      })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
              {watching === r.id && r.playback_url && (
                <CardContent className="pt-0 pb-4">
                  <video
                    src={r.playback_url}
                    poster={r.cover_url ?? undefined}
                    controls
                    preload="metadata"
                    className="w-full rounded-xl bg-black aspect-video"
                  />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="font-['Outfit']" dir="ltr">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit Recording" : "New Recording"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Lecture Title</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Lecture Unit 1"
                />
              </div>
              <FileUploadField
                label="Video file from device (or external link)"
                value={draft.videoUrl}
                onChange={(v) => setDraft({ ...draft, videoUrl: v })}
                bucket="content"
                kind="video"
                folder="recordings"
              />
              <FileUploadField
                label="Cover photo (optional)"
                value={draft.thumbnailUrl}
                onChange={(v) => setDraft({ ...draft, thumbnailUrl: v })}
                bucket="content"
                kind="image"
                folder="recording-covers"
              />
              <div className="space-y-1.5">
                <Label>Level (optional)</Label>
                <Select value={draft.sectionId} onValueChange={(v) => setDraft({ ...draft, sectionId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {(sectionsQuery.data ?? []).map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Short Description</Label>
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={() => draft && save.mutate(draft)} disabled={save.isPending || !draft?.title}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

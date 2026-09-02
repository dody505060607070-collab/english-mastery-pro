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
import { getStorageBudget } from "@/lib/storage-budget.functions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileUploadField } from "@/components/FileUploadField";
import { LectureRecorder } from "@/components/LectureRecorder";
import { LectureUploadCard } from "@/components/LectureUploadCard";
import {
  listRecordings,
  saveRecording,
  setRecordingPublished,
  deleteRecording,
} from "@/lib/recordings.functions";
import { listSections } from "@/lib/admin-manage.functions";
import { isYouTubeUrl, youTubeEmbedUrl, youTubeThumbnail } from "@/lib/youtube";


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
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);

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
      toast.success("Recording and its stored file were permanently deleted");
      setDeleting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6" dir="ltr">
      <StorageBudgetBar />

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

      <YouTubeLinkCard sections={sectionsQuery.data ?? []} onSaved={invalidate} />

      <LectureUploadCard onSaved={invalidate} />


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
                  <Button
                    size="sm"
                    variant="destructive"
                    aria-label={`Delete ${r.title}`}
                    onClick={() => setDeleting({ id: r.id, title: r.title })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
              {watching === r.id && r.playback_url && (
                <CardContent className="pt-0 pb-4">
                  {isYouTubeUrl(r.video_url) ? (
                    <iframe
                      src={youTubeEmbedUrl(r.video_url) ?? ""}
                      title={r.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full rounded-xl bg-black aspect-video border-0"
                    />
                  ) : (
                    <video
                      src={r.playback_url}
                      poster={r.cover_url ?? undefined}
                      controls
                      controlsList="nodownload noplaybackrate"
                      disablePictureInPicture
                      onContextMenu={(event) => event.preventDefault()}
                      preload="metadata"
                      className="w-full rounded-xl bg-black aspect-video"
                    />
                  )}
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
                label="Video file from device — stored on Cloudflare R2 (or paste a YouTube/external link)"
                value={draft.videoUrl}
                onChange={(v) => setDraft({ ...draft, videoUrl: v })}
                bucket="content"
                kind="video"
                folder="recordings"
                r2
              />

              <FileUploadField
                label="Cover photo (optional)"
                value={draft.thumbnailUrl}
                onChange={(v) => setDraft({ ...draft, thumbnailUrl: v })}
                bucket="content"
                kind="image"
                folder="recording-covers"
                r2
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

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent dir="ltr">
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this recording?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” and its video file will be deleted permanently. It will not appear under Recover &amp;
              Publish and this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Publish a lecture straight from a YouTube (unlisted) link — costs no storage. */
function YouTubeLinkCard({ sections, onSaved }: { sections: any[]; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [sectionId, setSectionId] = useState("all");

  const embed = youTubeEmbedUrl(url);
  const valid = !!embed && title.trim().length >= 2;

  const save = useMutation({
    mutationFn: () =>
      saveRecording({
        data: {
          title: title.trim(),
          videoUrl: url.trim(),
          thumbnailUrl: youTubeThumbnail(url),
          sectionId: sectionId === "all" ? null : sectionId,
          isPublished: true,
          status: "ready",
        },
      }),
    onSuccess: () => {
      toast.success("YouTube lecture published");
      setTitle("");
      setUrl("");
      setSectionId("all");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4 space-y-3">
        <div>
          <h2 className="font-black">Add a YouTube lecture link (unlisted)</h2>
          <p className="text-sm text-muted-foreground">
            Upload the lecture to YouTube as <strong>Unlisted</strong>, then paste the link here. It plays inside the
            site, uses no storage space, and students cannot download it.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Lecture title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Live session - Unit 1" />
          </div>
          <div className="space-y-1.5">
            <Label>YouTube link</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtu.be/XXXXXXXXXXX"
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {sections.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {url && !embed && (
          <p className="text-xs font-bold text-destructive">This is not a valid YouTube link.</p>
        )}
        {embed && (
          <iframe
            src={embed}
            title="YouTube preview"
            allowFullScreen
            className="w-full max-w-md rounded-xl bg-black aspect-video border-0"
          />
        )}
        <Button onClick={() => save.mutate()} disabled={!valid || save.isPending} className="gap-2">
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Publish YouTube lecture
        </Button>
      </CardContent>
    </Card>
  );
}


function StorageBudgetBar() {
  const { data } = useQuery({
    queryKey: ["storage-budget"],
    queryFn: () => getStorageBudget(),
    staleTime: 60_000,
  });
  if (!data) return null;
  if (!data.available) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-4 text-sm font-bold text-destructive">
          Cloudflare R2 storage status could not be verified. Uploads are safely blocked; try again before recording or use YouTube Unlisted.
        </CardContent>
      </Card>
    );
  }
  const pct = Math.min(100, Math.round((data.totalUsedMb / data.totalLimitMb) * 100));
  const usedGb = Math.round((data.totalUsedMb / 1024) * 100) / 100;
  return (
    <Card className={data.blocked ? "border-destructive/50" : ""}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>Cloudflare R2 storage (free 10GB)</span>
          <span>{usedGb}GB / 10GB</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div
            className={`h-2 rounded-full ${data.blocked ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {data.blocked
            ? "Your 10GB of Cloudflare storage is full — uploads are blocked. Upload the video to YouTube as Unlisted and paste the link below."
            : "Videos are stored on Cloudflare R2, so no site credits are used."}
        </p>
      </CardContent>
    </Card>
  );
}

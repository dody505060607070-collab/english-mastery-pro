import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Radio, Trash2, Pencil, Play, Square } from "lucide-react";

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
import {
  listLiveSessions,
  saveLiveSession,
  setLiveStatus,
  deleteLiveSession,
} from "@/lib/live.functions";
import { listSections } from "@/lib/admin-manage.functions";
import { detectPlatform, platformLabel, watchUrl, type StreamPlatform } from "@/lib/stream";
import { LectureRecorder } from "@/components/LectureRecorder";

export const Route = createFileRoute("/_authenticated/admin/live")({
  component: AdminLivePage,
});

type Draft = {
  id?: string;
  title: string;
  description: string;
  meetUrl: string;
  platform: StreamPlatform;
  sectionId: string;
  isLive: boolean;
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  meetUrl: "",
  platform: "youtube",
  sectionId: "all",
  isLive: true,
};

function AdminLivePage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const sectionsQuery = useQuery({ queryKey: ["admin-sections"], queryFn: () => listSections() });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-live"],
    queryFn: () => listLiveSessions(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-live"] });
    qc.invalidateQueries({ queryKey: ["live-sessions"] });
  };

  const save = useMutation({
    mutationFn: (d: Draft) =>
      saveLiveSession({
        data: {
          id: d.id,
          title: d.title,
          description: d.description || null,
          meetUrl: watchUrl(d.meetUrl),
          platform: d.platform,
          sectionId: d.sectionId === "all" ? null : d.sectionId,
          isLive: d.isLive,
        },
      }),
    onSuccess: () => {
      toast.success("Stream saved");
      setDraft(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; isLive: boolean }) => setLiveStatus({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteLiveSession({ data: { id } }),
    onSuccess: () => {
      toast.success("Stream deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Radio className="h-5 w-5 text-destructive" /> Live Courses
          </h1>
          <p className="text-sm text-muted-foreground">
            Add a YouTube or TikTok stream link and start it so it appears on the site for students, and record the lecture with one click.
          </p>
        </div>
        <Button onClick={() => setDraft({ ...emptyDraft })} className="gap-2">
          <Plus className="h-4 w-4" /> New Stream
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground font-bold">
            No streams added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black truncate">{s.title}</p>
                    {s.is_live ? (
                      <Badge className="bg-destructive text-destructive-foreground">Live</Badge>
                    ) : (
                      <Badge variant="secondary">Stopped</Badge>
                    )}
                    <Badge variant="outline">
                      {platformLabel[(s.platform as StreamPlatform) ?? detectPlatform(s.meeting_url)] ?? s.platform}
                    </Badge>
                    {s.sections?.name && <Badge variant="outline">{s.sections.name}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">
                    {s.meeting_url}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={s.is_live ? "secondary" : "default"}
                    className="gap-1"
                    onClick={() => toggle.mutate({ id: s.id, isLive: !s.is_live })}
                  >
                    {s.is_live ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {s.is_live ? "Stop" : "Start"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft({
                        id: s.id,
                        title: s.title,
                        description: s.description ?? "",
                        meetUrl: s.meeting_url,
                        platform: (s.platform as StreamPlatform) ?? detectPlatform(s.meeting_url),
                        sectionId: s.section_id ?? "all",
                        isLive: s.is_live,
                      })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove.mutate(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                </div>
                <div className="w-full rounded-xl border bg-muted/30 p-3">
                  <LectureRecorder
                    title={s.title}
                    liveSessionId={s.id}
                    sectionId={s.section_id}
                    onSaved={invalidate}
                  />
                </div>
              </CardContent>
            </Card>

          ))}
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="font-['Outfit'] max-h-[85vh] overflow-y-auto" dir="ltr">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit Stream" : "New Stream"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Stream Title</Label>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Live Session - Unit 1"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Streaming Platform</Label>
                <Select
                  value={draft.platform}
                  onValueChange={(v) => setDraft({ ...draft, platform: v as StreamPlatform })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube (shown on the site)</SelectItem>
                    <SelectItem value="tiktok">TikTok (shown on the site)</SelectItem>
                    <SelectItem value="meet">Google Meet (external link)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stream Link</Label>
                <Input
                  dir="ltr"
                  value={draft.meetUrl}
                  onChange={(e) =>
                    setDraft({ ...draft, meetUrl: e.target.value, platform: detectPlatform(e.target.value) })
                  }
                  placeholder={
                    draft.platform === "tiktok"
                      ? "https://www.tiktok.com/@username/live"
                      : "https://www.youtube.com/watch?v=xxxxxxxxxxx"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  YouTube: the live stream or video link. TikTok: your live link.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Level (optional)</Label>
                <Select
                  value={draft.sectionId}
                  onValueChange={(v) => setDraft({ ...draft, sectionId: v })}
                >
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
            <Button
              onClick={() => draft && save.mutate(draft)}
              disabled={save.isPending || !draft?.title || !draft?.meetUrl}
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              Save & Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

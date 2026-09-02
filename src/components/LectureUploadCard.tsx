import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImageIcon, Loader2, Smartphone, Video } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { saveRecording } from "@/lib/recordings.functions";
import { createR2UploadUrl } from "@/lib/r2.functions";
import { getStorageBudget } from "@/lib/storage-budget.functions";

/**
 * Upload a lecture straight from the phone/computer storage (video or image),
 * no external link needed. Uses resumable upload so large videos work on mobile data.
 */
export function LectureUploadCard({
  sectionId,
  onSaved,
}: {
  sectionId?: string | null;
  onSaved?: () => void;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const requestR2Url = useServerFn(createR2UploadUrl);
  const persistRecording = useServerFn(saveRecording);
  const checkBudget = useServerFn(getStorageBudget);

  function putToR2(url: string, file: File) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      if (file.type) xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Cloudflare R2 upload failed (${xhr.status})`));
      xhr.onerror = () => reject(new Error("Could not reach Cloudflare R2. Check the connection and try again."));
      xhr.send(file);
    });
  }

  function readVideoDuration(file: File): Promise<number | null> {
    if (!file.type.startsWith("video/")) return Promise.resolve(null);
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);
      const done = (value: number | null) => {
        URL.revokeObjectURL(url);
        video.removeAttribute("src");
        resolve(value);
      };
      video.preload = "metadata";
      video.onloadedmetadata = () =>
        done(Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : null);
      video.onerror = () => done(null);
      video.src = url;
    });
  }

  async function handle(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast.error("Maximum size is 2GB");
      return;
    }
    setBusy(true);
    setProgress(0);
    setFileName(file.name);
    try {
      const durationSeconds = await readVideoDuration(file);
      const budget = await checkBudget();
      const fileMb = file.size / (1024 * 1024);
      if (!budget.available) throw new Error("Cloudflare R2 storage could not be verified. Nothing was uploaded; please try again.");
      if (budget.blocked || fileMb > budget.totalRemainingMb) {
        throw new Error("Your free 10GB of Cloudflare R2 storage is full. Upload this video to YouTube as Unlisted instead.");
      }
      const { uploadUrl, storedValue } = await requestR2Url({
        data: { filename: file.name, contentType: file.type || null, folder: "recordings", sizeBytes: file.size },
      });
      await putToR2(uploadUrl, file);
      await persistRecording({
        data: {
          title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
          description: null,
          videoUrl: storedValue,
          durationSeconds,
          sectionId: sectionId ?? null,
          isPublished: true,
          status: "ready",
        },
      });
      toast.success("Lecture uploaded to Cloudflare R2 and published to students");
      setTitle("");
      setFileName("");
      onSaved?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(0);
      if (galleryRef.current) galleryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
      if (imageRef.current) imageRef.current.value = "";
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <p className="font-black">Upload a lecture from phone files</p>
        </div>
        <div className="space-y-1.5">
          <Label>Lecture title (optional)</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Unit 1 lecture"
            disabled={busy}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            type="button"
            className="gap-2 h-12 font-black"
            onClick={() => galleryRef.current?.click()}
            disabled={busy}
          >
            <Video className="h-5 w-5" /> Video from device
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="gap-2 h-12 font-black"
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
          >
            <Camera className="h-5 w-5" /> Record with camera
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 h-12 font-black"
            onClick={() => imageRef.current?.click()}
            disabled={busy}
          >
            <ImageIcon className="h-5 w-5" /> Image / file
          </Button>
        </div>

        {busy && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading {fileName} … {progress}%
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Supports videos up to 2GB. Uploads go directly to Cloudflare R2 and stop when the free 10GB is full.
        </p>

        <input
          ref={galleryRef}
          type="file"
          hidden
          accept="video/*"
          onChange={(e) => handle(e.target.files)}
        />
        <input
          ref={cameraRef}
          type="file"
          hidden
          accept="video/*"
          capture="environment"
          onChange={(e) => handle(e.target.files)}
        />
        <input
          ref={imageRef}
          type="file"
          hidden
          accept="image/*,application/pdf"
          onChange={(e) => handle(e.target.files)}
        />
      </CardContent>
    </Card>
  );
}

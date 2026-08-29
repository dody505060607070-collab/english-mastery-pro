import { useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, Smartphone, Video } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { uploadFile } from "@/lib/storage";
import { saveRecording } from "@/lib/recordings.functions";

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
      const path = await uploadFile("content", file, "recordings", setProgress);
      await saveRecording({
        data: {
          title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
          description: null,
          videoUrl: path,
          sectionId: sectionId ?? null,
          isPublished: true,
          status: "ready",
        },
      });
      toast.success("Lecture uploaded and published to students");
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
          Supports large videos up to 2GB, and resumes automatically if the connection drops.
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

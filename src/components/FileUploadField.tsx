import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ACCEPT_MAP, uploadFile, useMediaUrl, type StorageBucket } from "@/lib/storage";

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

export function FileUploadField({
  label,
  value,
  onChange,
  bucket = "content",
  kind = "any",
  folder = "",
  capture,
}: {
  label: string;
  value: string;
  onChange: (path: string) => void;
  bucket?: StorageBucket;
  kind?: keyof typeof ACCEPT_MAP;
  folder?: string;
  capture?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const preview = useMediaUrl(value, bucket);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Maximum file size is 2GB");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const path = await uploadFile(bucket, file, folder, setProgress);
      onChange(path);
      toast.success("File uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label className="font-bold">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Upload a file from your device or paste a link"
          dir="ltr"
          className="flex-1"
        />
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")}>
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span className="mr-2 hidden sm:inline">Upload</span>
        </Button>
      </div>
      {busy && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground font-bold">Uploading… {progress}%</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={ACCEPT_MAP[kind]}
        {...(capture ? { capture: "environment" as const } : {})}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {preview && kind === "image" && (
        <img src={preview} alt="preview" className="h-28 w-28 rounded-xl object-cover border" />
      )}
    </div>
  );
}

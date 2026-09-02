import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ACCEPT_MAP, uploadFile, useMediaUrl, type StorageBucket } from "@/lib/storage";
import { getStorageBudget } from "@/lib/storage-budget.functions";
import { createR2UploadUrl } from "@/lib/r2.functions";

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

const OVER_BUDGET_MSG =
  "Your free 10GB of Cloudflare R2 storage is full. Please upload this video to YouTube as Unlisted and paste the link here instead.";

export function FileUploadField({
  label,
  value,
  onChange,
  bucket = "content",
  kind = "any",
  folder = "",
  capture,
  budgetGuard = false,
  r2 = false,
}: {
  label: string;
  value: string;
  onChange: (path: string) => void;
  bucket?: StorageBucket;
  kind?: keyof typeof ACCEPT_MAP;
  folder?: string;
  capture?: boolean;
  /** Blocks the upload when the monthly / total Cloud storage budget is used up. */
  budgetGuard?: boolean;
  /** Sends the file to Cloudflare R2 instead of Cloud storage (lecture videos). */
  r2?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);
  const preview = useMediaUrl(value, bucket);
  const checkBudget = useServerFn(getStorageBudget);
  const requestR2Url = useServerFn(createR2UploadUrl);

  /** Direct browser → R2 upload with real progress. */
  function putToR2(url: string, file: File) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      if (file.type) xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Upload failed (${xhr.status})`));
      xhr.onerror = () => reject(new Error("Network error while uploading"));
      xhr.send(file);
    });
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Maximum file size is 2GB");
      return;
    }
    setBlockedMsg(null);
    if (budgetGuard || r2) {
      try {
        const b = await checkBudget();
        const fileMb = file.size / (1024 * 1024);
        if (!b.available || b.blocked || fileMb > b.totalRemainingMb) {
          const msg = b.available
            ? `${OVER_BUDGET_MSG} (Used: ${b.totalUsedMb}MB / ${b.totalLimitMb}MB)`
            : "Cloudflare R2 storage could not be verified. Nothing was uploaded; please try again.";
          setBlockedMsg(msg);
          toast.error(msg);
          if (inputRef.current) inputRef.current.value = "";
          return;
        }
      } catch {
        const msg = "Cloudflare R2 storage could not be verified. Nothing was uploaded; please try again.";
        setBlockedMsg(msg);
        toast.error(msg);
        return;
      }
    }
    setBusy(true);
    setProgress(0);
    try {
      if (r2) {
        const { uploadUrl, storedValue } = await requestR2Url({
          data: { filename: file.name, contentType: file.type || null, folder: folder || "media", sizeBytes: file.size },
        });
        await putToR2(uploadUrl, file);
        onChange(storedValue);
        toast.success("Uploaded to Cloudflare R2");
      } else {
        const path = await uploadFile(bucket, file, folder, setProgress);
        onChange(path);
        toast.success("File uploaded");
      }
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
      {blockedMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{blockedMsg}</span>
        </div>
      )}
      {preview && kind === "image" && (
        <img src={preview} alt="preview" className="h-28 w-28 rounded-xl object-cover border" />
      )}

    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const signedCache = new Map<string, string>();

export type StorageBucket = "content" | "receipts" | "avatars";

/** Small files go through the normal API; anything bigger uses resumable (TUS) upload. */
const RESUMABLE_THRESHOLD = 6 * 1024 * 1024;

function buildPath(file: File, folder: string) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return folder ? `${folder.replace(/\/$/, "")}/${safe}` : safe;
}

/** Resumable upload — works for large phone videos and reports real progress. */
async function uploadResumable(
  bucket: StorageBucket,
  file: File,
  path: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const { Upload } = await import("tus-js-client");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("انتهت الجلسة، سجّل الدخول مرة أخرى");

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `${import.meta.env['VITE_SUPABASE_URL']}/storage/v1/upload/resumable`,
      retryDelays: [0, 2000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${token}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      onError: (err) => reject(err instanceof Error ? err : new Error(String(err))),
      onProgress: (sent, total) => onProgress?.(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then((prev) => {
      if (prev.length > 0 && prev[0]) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });
}

/** Uploads a real file picked from the device to a storage bucket. Returns the stored path. */
export async function uploadFile(
  bucket: StorageBucket,
  file: File,
  folder = "",
  onProgress?: (pct: number) => void,
): Promise<string> {
  const path = buildPath(file, folder);

  if (file.size > RESUMABLE_THRESHOLD) {
    onProgress?.(1);
    await uploadResumable(bucket, file, path, onProgress);
    onProgress?.(100);
    return path;
  }

  onProgress?.(10);
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    ...(file.type ? { contentType: file.type } : {}),
  });
  if (error) throw new Error(error.message);
  onProgress?.(100);
  return path;
}

export async function getSignedUrl(bucket: string, path: string, expires = 3600) {
  const key = `${bucket}:${path}`;
  const cached = signedCache.get(key);
  if (cached) return cached;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
  if (data?.signedUrl) signedCache.set(key, data.signedUrl);
  return data?.signedUrl ?? null;
}

/** Resolves either a full URL or a storage path into a usable src. */
export function useMediaUrl(path?: string | null, bucket = "content") {
  const [url, setUrl] = useState<string | null>(
    path && (path.startsWith("http") || path.startsWith("data:")) ? path : null,
  );

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    if (path.startsWith("http") || path.startsWith("data:")) {
      setUrl(path);
      return;
    }
    getSignedUrl(bucket, path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path, bucket]);

  return url;
}

export const ACCEPT_MAP: Record<string, string> = {
  video: "video/*",
  audio: "audio/*",
  image: "image/*",
  pdf: "application/pdf",
  document:
    "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  any: "*/*",
};

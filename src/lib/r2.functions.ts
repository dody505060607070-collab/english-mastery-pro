import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Stored value shape for R2 objects: `r2:<key>` */
export const R2_PREFIX = "r2:";

/** Staff-only: presigned PUT URL so the browser uploads media straight to R2. */
export const createR2UploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        filename: z.string().trim().min(1).max(200),
        contentType: z.string().trim().max(120).optional().nullable(),
        folder: z.string().trim().max(60).optional().nullable(),
        sizeBytes: z.number().int().positive().max(2 * 1024 * 1024 * 1024),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "recordings");
    const { presignR2, readR2Config, r2UsedBytes } = await import("@/lib/r2.server");

    const limitBytes = 10 * 1024 * 1024 * 1024;
    let usedBytes: number;
    try {
      usedBytes = await r2UsedBytes();
    } catch {
      throw new Error("Cloudflare R2 storage could not be verified. Nothing was uploaded; please try again.");
    }
    if (usedBytes + data.sizeBytes > limitBytes) {
      throw new Error(
        "Your free 10GB of Cloudflare R2 storage is full. Upload this video to YouTube as Unlisted instead.",
      );
    }

    const ext = data.filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const folder = (data.folder || "recordings").replace(/[^a-zA-Z0-9/_-]/g, "") || "recordings";
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadUrl = await presignR2("PUT", key, 60 * 60);
    readR2Config();
    // Always persist the storage key, never an expiring or public URL. Playback
    // resolves it later, and deletion can always identify and free the object.
    const storedValue = `${R2_PREFIX}${key}`;
    return { uploadUrl, storedValue, key, usedBytes, remainingBytes: limitBytes - usedBytes };
  });


/** Signed (or public) playback URL for an R2-hosted video. */
export const getR2PlaybackUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ key: z.string().trim().min(1).max(500) }).parse(data))
  .handler(async ({ data }) => {
    const { r2PlaybackUrl } = await import("@/lib/r2.server");
    const key = data.key.startsWith(R2_PREFIX) ? data.key.slice(R2_PREFIX.length) : data.key;
    return { url: await r2PlaybackUrl(key) };
  });

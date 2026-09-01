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
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "recordings");
    const { presignR2, readR2Config } = await import("@/lib/r2.server");

    const ext = data.filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const folder = (data.folder || "recordings").replace(/[^a-zA-Z0-9/_-]/g, "") || "recordings";
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadUrl = await presignR2("PUT", key, 60 * 60);
    const publicBase = readR2Config().publicBaseUrl;
    // A public custom domain lets us store a plain https URL that works everywhere.
    const storedValue = publicBase ? `${publicBase}/${key}` : `${R2_PREFIX}${key}`;
    return { uploadUrl, storedValue, key };
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

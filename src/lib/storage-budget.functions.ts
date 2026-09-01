import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * All media now lives on Cloudflare R2 (10 GB free tier, zero egress cost).
 * Nothing is uploaded to Lovable Cloud storage anymore, so no credits are used.
 * Once the 10 GB are full, uploads are blocked and the admin must use an
 * unlisted YouTube link instead (free and unlimited).
 */
export const TOTAL_STORAGE_LIMIT_MB = 10 * 1024; // 10 GB on Cloudflare R2

const MB = 1024 * 1024;

export type StorageBudget = {
  totalUsedMb: number;
  totalLimitMb: number;
  totalRemainingMb: number;
  blocked: boolean;
  available: boolean;
};

export const getStorageBudget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<StorageBudget> => {
    try {
      const { r2UsedBytes } = await import("@/lib/r2.server");
      const used = await r2UsedBytes();
      const totalUsedMb = Math.round((used / MB) * 10) / 10;
      return {
        totalUsedMb,
        totalLimitMb: TOTAL_STORAGE_LIMIT_MB,
        totalRemainingMb: Math.max(0, TOTAL_STORAGE_LIMIT_MB - totalUsedMb),
        blocked: totalUsedMb >= TOTAL_STORAGE_LIMIT_MB,
        available: true,
      };
    } catch {
      // R2 not configured / unreachable — don't block the admin's work.
      return {
        totalUsedMb: 0,
        totalLimitMb: TOTAL_STORAGE_LIMIT_MB,
        totalRemainingMb: TOTAL_STORAGE_LIMIT_MB,
        blocked: false,
        available: false,
      };
    }
  });

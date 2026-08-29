import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Video uploads to Cloud storage burn credits (storage + egress).
 * These caps keep the monthly spend near zero — beyond them the admin must
 * use an unlisted YouTube link instead (free, unlimited).
 */
export const MONTHLY_UPLOAD_LIMIT_MB = 300; // ~ a few credits / month
export const TOTAL_STORAGE_LIMIT_MB = 800;

const MB = 1024 * 1024;
const WATCHED_FOLDERS = ["recordings", "recording-covers"];

export type StorageBudget = {
  monthlyUsedMb: number;
  totalUsedMb: number;
  monthlyLimitMb: number;
  totalLimitMb: number;
  monthlyRemainingMb: number;
  totalRemainingMb: number;
  blocked: boolean;
};

export const getStorageBudget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<StorageBudget> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    let total = 0;
    let monthly = 0;

    for (const folder of WATCHED_FOLDERS) {
      let offset = 0;
      // paginate through the folder
      for (;;) {
        const { data, error } = await supabaseAdmin.storage
          .from("content")
          .list(folder, { limit: 100, offset });
        if (error || !data || data.length === 0) break;
        for (const obj of data) {
          const size = Number((obj.metadata as { size?: number } | null)?.size ?? 0);
          if (!size) continue;
          total += size;
          const created = obj.created_at ? new Date(obj.created_at) : null;
          if (created && created >= monthStart) monthly += size;
        }
        if (data.length < 100) break;
        offset += 100;
      }
    }

    const monthlyUsedMb = Math.round((monthly / MB) * 10) / 10;
    const totalUsedMb = Math.round((total / MB) * 10) / 10;

    return {
      monthlyUsedMb,
      totalUsedMb,
      monthlyLimitMb: MONTHLY_UPLOAD_LIMIT_MB,
      totalLimitMb: TOTAL_STORAGE_LIMIT_MB,
      monthlyRemainingMb: Math.max(0, MONTHLY_UPLOAD_LIMIT_MB - monthlyUsedMb),
      totalRemainingMb: Math.max(0, TOTAL_STORAGE_LIMIT_MB - totalUsedMb),
      blocked:
        monthlyUsedMb >= MONTHLY_UPLOAD_LIMIT_MB || totalUsedMb >= TOTAL_STORAGE_LIMIT_MB,
    };
  });

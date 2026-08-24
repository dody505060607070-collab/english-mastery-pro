import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { awardXp } from "@/lib/xp.server";

/**
 * XP is awarded server-side only. The client may say WHY (a whitelisted reason),
 * never HOW MUCH — otherwise anyone could mint unlimited XP.
 */
export const grantXP = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        reason: z.enum(["lesson_complete", "course_complete"]),
        note: z.string().trim().max(160).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    return awardXp(context.userId, data.reason, data.note);
  });

export const getUserStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_stats")
      .select("xp, level, profiles(full_name, phone)")
      .order("xp", { ascending: false })
      .limit(10);

    if (error) throw error;
    return data;
  });

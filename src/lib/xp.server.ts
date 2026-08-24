/** Server-only XP awarding. Amounts are decided here, never by the client. */

export const XP_REWARDS = {
  lesson_complete: 50,
  course_complete: 500,
  placement_test: 1000,
  exercise_complete: 20,
} as const;

export type XpReason = keyof typeof XP_REWARDS;

export async function awardXp(userId: string, reason: XpReason, note?: string) {
  const amount = XP_REWARDS[reason];
  if (!amount) return { success: false as const };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { error } = await supabaseAdmin.rpc("add_xp", {
    _user_id: userId,
    _amount: amount,
  } as never);
  if (error) {
    console.error("[xp] add_xp failed", error.message);
    return { success: false as const };
  }

  await supabaseAdmin.from("xp_logs").insert({
    user_id: userId,
    amount,
    action_type: note ? `${reason}: ${note}` : reason,
  });

  return { success: true as const, amount };
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAccountRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("pending") })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);

    let query = context.supabase
      .from("profiles")
      .select(
        "id, full_name, phone, avatar_url, grade, created_at, approval_status, approval_note, sections:section_id (name)",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (data.status !== "all") query = query.eq("approval_status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setAccountApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        status: z.enum(["pending", "approved", "rejected"]),
        note: z.string().trim().max(300).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);

    const { error } = await context.supabase
      .from("profiles")
      .update({
        approval_status: data.status,
        approval_note: data.note ?? null,
        approved_at: data.status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const countPendingAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const { count } = await context.supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending");
    return { count: count ?? 0 };
  });

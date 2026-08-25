import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Student creates a payment request with an uploaded receipt path. */
export const createPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        courseId: z.string().uuid(),
        amount: z.number().nonnegative(),
        paymentMethod: z.string().trim().min(2).max(50),
        senderPhone: z.string().trim().regex(/^\d{10,15}$/, "Invalid number"),
        screenshotPath: z.string().trim().min(1).max(500),
        planName: z.string().trim().max(80).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("payment_requests").insert({
      user_id: context.userId,
      course_id: data.courseId,
      amount: data.amount,
      payment_method: data.paymentMethod,
      sender_phone: data.senderPhone,
      screenshot_url: data.screenshotPath,
      plan_name: data.planName ?? null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyPaymentRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payment_requests")
      .select("*, courses(title)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Admin: all payment requests with student + course info. */
export const listPaymentRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "payments");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("payment_requests")
      .select("*, courses(title, price)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, avatar_url")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));

    return (data ?? []).map((r) => ({ ...r, student: r.user_id ? (map.get(r.user_id) ?? null) : null }));
  });

/** Admin approves or rejects a payment; approving enrolls the student immediately. */
export const decidePaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().trim().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "payments");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error } = await supabaseAdmin
      .from("payment_requests")
      .select("*, courses(title)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Request not found");

    await supabaseAdmin
      .from("payment_requests")
      .update({
        status: data.decision,
        decision_note: data.note ?? null,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    const courseTitle = (req.courses as { title?: string } | null)?.title ?? "the course";

    if (data.decision === "approved" && req.user_id && req.course_id) {
      await supabaseAdmin
        .from("enrollments")
        .upsert({ user_id: req.user_id, course_id: req.course_id }, { onConflict: "user_id,course_id" });
      await supabaseAdmin.from("subscriptions").insert({
        user_id: req.user_id,
        plan_name: req.plan_name ?? courseTitle,
        status: "active",
        amount_paid: req.amount,
        currency: "EGP",
        starts_at: new Date().toISOString(),
      });
    }

    if (req.user_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: req.user_id,
        title: data.decision === "approved" ? "Your subscription has been activated" : "Your payment request was rejected",
        message:
          data.decision === "approved"
            ? `Your payment has been accepted and «${courseTitle}» is now active. You can start learning now.`
            : `Your payment request for «${courseTitle}» was rejected.${data.note ? ` Reason: ${data.note}` : ""}`,
        type: data.decision === "approved" ? "success" : "warning",
      });
    }

    return { ok: true };
  });

/** Admin: sends a notification to one student or to everyone. */
export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        title: z.string().trim().min(2).max(120),
        message: z.string().trim().min(2).max(500),
        userId: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertCan } = await import("@/lib/staff.server");
    await assertCan(context.supabase, context.userId, "payments");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let targets: string[] = [];
    if (data.userId) targets = [data.userId];
    else {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
      targets = (profiles ?? []).map((p) => p.id);
    }

    if (!targets.length) return { sent: 0 };
    const { error } = await supabaseAdmin.from("notifications").insert(
      targets.map((id) => ({
        user_id: id,
        title: data.title,
        message: data.message,
        type: "info",
      })),
    );
    if (error) throw new Error(error.message);
    return { sent: targets.length };
  });

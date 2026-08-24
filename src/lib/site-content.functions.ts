import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type SiteContentValue = { ar?: JsonValue; en?: JsonValue; value?: JsonValue };
export type SiteContentMap = Record<string, SiteContentValue>;

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.from("site_content" as never).select("key, value");
  if (error) throw new Error(error.message);
  const map: SiteContentMap = {};
  for (const row of (data ?? []) as { key: string; value: SiteContentValue }[]) {
    map[row.key] = row.value;
  }
  return map;
});

export const saveSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        items: z
          .array(
            z.object({
              key: z.string().trim().min(1).max(120),
              value: z.record(z.string(), z.unknown()),
            }),
          )
          .max(100),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);

    const rows = data.items.map((i) => ({
      key: i.key,
      value: i.value,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await context.supabase.from("site_content" as never).upsert(rows as never);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteSiteContentKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ key: z.string().trim().min(1).max(120) }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/staff.server");
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("site_content" as never)
      .delete()
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { success: true };
  });

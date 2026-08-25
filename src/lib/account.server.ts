export type StaffAllowEntry = { phone: string; role: "admin" | "teacher" };
export type AppRole = "admin" | "super_admin" | "editor" | "teacher" | "student";
export type ProfileRole = "admin" | "instructor" | "student";

export const ADMIN_PHONES = ["01222576172", "01203529460"];

const STAFF_KEY = "staff.allowed_phones";
const phoneRegex = /^[0-9]{10,15}$/;

export function decodeDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const payload = match[2];
  if (!mime || !payload) return null;
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  if (bytes.byteLength > 3_000_000) return null;
  return { mime, bytes, ext: mime.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg" };
}

export async function readStaffAllowlist() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("site_content" as never)
    .select("value")
    .eq("key", STAFF_KEY)
    .maybeSingle();
  const raw = (data as { value?: unknown } | null)?.value;
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((e): e is StaffAllowEntry => !!e && typeof (e as StaffAllowEntry).phone === "string")
    .map((e) => ({
      phone: String(e.phone).replace(/\D/g, "").replace(/^20(?=1\d{9}$)/, "0"),
      role: e.role === "admin" ? "admin" : "teacher",
    }) as StaffAllowEntry)
    .filter((e) => phoneRegex.test(e.phone));
}

export async function requireAdmin(supabase: { rpc: Function }, userId: string) {
  const { data } = await (supabase as any).rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("This action is admin only");
}

export async function saveStaffAllowlist(entries: StaffAllowEntry[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("site_content" as never)
    .upsert({ key: STAFF_KEY, value: entries } as never);
  if (error) throw new Error(error.message);
}

export function toProfileRole(role: AppRole): ProfileRole {
  if (role === "student") return "student";
  if (role === "teacher" || role === "editor") return "instructor";
  return "admin";
}

export async function findAuthUserByEmail(supabaseAdmin: any, email: string) {
  const needle = email.toLowerCase();
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    const user = users.find((u: { email?: string | null }) => u.email?.toLowerCase() === needle);
    if (user) return user;
    if (users.length < 1000) return null;
  }
  return null;
}
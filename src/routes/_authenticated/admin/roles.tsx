import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Shield, ShieldAlert, Users, Phone, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAllUsers, createUserWithRole, setUserRole } from "@/lib/admin-manage.functions";
import { listStaffPhones, saveStaffPhones } from "@/lib/account.functions";
import { useAccount } from "@/hooks/useAccount";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions | Blue Language Academy" },
      { name: "description", content: "Manage admin, teacher and student permissions" },
    ],
  }),
  component: AdminRoles,
});

type Role = "admin" | "teacher" | "student";

const ROLE_META: Record<Role, { label: string; color: string; can: string[] }> = {
  admin: {
    label: "مدير (Admin)",
    color: "bg-orange-500",
    can: ["تحكم كامل", "إدارة المدرسين والطلاب", "الصلاحيات", "تعديل الواجهة", "المدفوعات"],
  },
  teacher: {
    label: "مدرس (Teacher)",
    color: "bg-blue-500",
    can: ["رؤية الطلاب", "إضافة المحتوى", "تعديل المحتوى", "الليف والتسجيلات", "القاموس"],
  },
  student: {
    label: "طالب (Student)",
    color: "bg-slate-500",
    can: ["الدروس والوحدات", "التمارين والاختبارات", "التقدم والنقاط"],
  },
};

const emptyForm = { fullName: "", phone: "", password: "", role: "teacher" as Role };

function AdminRoles() {
  const qc = useQueryClient();
  const { data: account } = useAccount();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<typeof emptyForm | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: () => listAllUsers(),
    enabled: !!account?.isAdmin,
  });

  const [newPhone, setNewPhone] = useState("");
  const [newPhoneRole, setNewPhoneRole] = useState<"admin" | "teacher">("teacher");

  const { data: staffPhones } = useQuery({
    queryKey: ["staff-allowed-phones"],
    queryFn: () => listStaffPhones(),
    enabled: !!account?.isAdmin,
  });

  const savePhones = useMutation({
    mutationFn: (entries: { phone: string; role: "admin" | "teacher" }[]) =>
      saveStaffPhones({ data: { entries } }),
    onSuccess: () => {
      toast.success("تم تحديث الأرقام المصرح لها");
      setNewPhone("");
      qc.invalidateQueries({ queryKey: ["staff-allowed-phones"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addPhone = () => {
    const phone = newPhone.trim();
    if (!/^[0-9]{10,15}$/.test(phone)) {
      toast.error("رقم غير صحيح");
      return;
    }
    const next = [
      ...(staffPhones ?? []).filter((e) => e.phone !== phone),
      { phone, role: newPhoneRole },
    ];
    savePhones.mutate(next);
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-all-users"] });
    qc.invalidateQueries({ queryKey: ["admin-students"] });
  };

  const create = useMutation({
    mutationFn: (f: typeof emptyForm) => createUserWithRole({ data: f }),
    onSuccess: () => {
      toast.success("تم إنشاء الحساب");
      setForm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => setUserRole({ data: v }),
    onSuccess: () => {
      toast.success("تم تحديث الصلاحية");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users ?? [];
    if (!q) return list;
    return list.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(q) || (u.phone ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  if (account && !account.isAdmin) {
    return (
      <div className="py-20 text-center space-y-3" dir="rtl">
        <ShieldAlert className="h-10 w-10 mx-auto text-destructive" />
        <p className="font-bold">هذا القسم للمدير فقط</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-['Cairo']" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> الأدوار والصلاحيات
          </h1>
          <p className="text-sm text-muted-foreground">
            أضف مدير أو مدرس أو طالب، وغيّر صلاحية أي مستخدم في أي وقت.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setForm({ ...emptyForm })}>
          <Plus className="h-4 w-4" /> إضافة مستخدم بصلاحية
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(ROLE_META) as Role[]).map((r) => (
          <Card key={r} className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 h-full w-1 ${ROLE_META[r].color}`} />
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{ROLE_META[r].label}</span>
                <Badge variant="secondary">
                  {(users ?? []).filter((u) => u.roles.includes(r)).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1">
              {ROLE_META[r].can.map((c) => (
                <Badge key={c} variant="outline" className="text-[10px]">
                  {c}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" /> أرقام مصرح لها بإنشاء حساب مدير / مدرس
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            أي رقم هنا يقدر يعمل Sign Up من صفحة الدخول كـ Admin / Teacher. أي رقم تاني مش هيقدر.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input
              className="h-11 max-w-52"
              placeholder="01xxxxxxxxx"
              dir="ltr"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <Select value={newPhoneRole} onValueChange={(v) => setNewPhoneRole(v as "admin" | "teacher")}>
              <SelectTrigger className="h-11 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">مدير</SelectItem>
                <SelectItem value="teacher">مدرس</SelectItem>
              </SelectContent>
            </Select>
            <Button className="h-11 gap-2" onClick={addPhone} disabled={savePhones.isPending}>
              {savePhones.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              OK
            </Button>
          </div>
          {(staffPhones ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground font-bold">لا توجد أرقام مضافة.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(staffPhones ?? []).map((e) => (
                <div key={e.phone} className="flex items-center gap-2 rounded-xl border px-3 py-2">
                  <span dir="ltr" className="font-bold text-sm">{e.phone}</span>
                  <Badge variant="secondary">{e.role === "admin" ? "مدير" : "مدرس"}</Badge>
                  <button
                    type="button"
                    onClick={() =>
                      savePhones.mutate((staffPhones ?? []).filter((x) => x.phone !== e.phone))
                    }
                    className="text-destructive"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> كل المستخدمين
          </CardTitle>
          <Input
            className="h-10 max-w-56"
            placeholder="بحث بالاسم أو الرقم"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground font-bold">لا يوجد مستخدمون.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => {
                const current = (["admin", "teacher", "student"] as Role[]).find((r) =>
                  u.roles.includes(r),
                );
                const isSuper = u.roles.includes("super_admin");
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-xl border p-3 flex-wrap"
                  >
                    <div className="flex-1 min-w-40">
                      <p className="font-bold truncate">{u.full_name || "بدون اسم"}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {u.phone}
                      </p>
                    </div>
                    {u.is_blocked && <Badge variant="destructive">محظور</Badge>}
                    {isSuper ? (
                      <Badge className="bg-red-500">super_admin</Badge>
                    ) : (
                      <Select
                        value={current ?? "student"}
                        onValueChange={(v) => changeRole.mutate({ userId: u.id, role: v as Role })}
                        disabled={u.id === account?.userId || changeRole.isPending}
                      >
                        <SelectTrigger className="h-10 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">مدير</SelectItem>
                          <SelectItem value="teacher">مدرس</SelectItem>
                          <SelectItem value="student">طالب</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="font-['Cairo']" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>الاسم الكامل</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>رقم الهاتف (يُستخدم لتسجيل الدخول)</Label>
                <Input
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>كلمة السر</Label>
                <Input
                  dir="ltr"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>الصلاحية</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as Role })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="teacher">مدرس</SelectItem>
                    <SelectItem value="student">طالب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setForm(null)}>
              إلغاء
            </Button>
            <Button
              onClick={() => form && create.mutate(form)}
              disabled={
                create.isPending ||
                !form?.fullName ||
                !form?.phone ||
                (form?.password?.length ?? 0) < 6
              }
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

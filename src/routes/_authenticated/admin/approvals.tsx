import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, UserCheck, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StorageAvatar } from "@/components/StorageAvatar";
import { listAccountRequests, setAccountApproval } from "@/lib/approvals.functions";

export const Route = createFileRoute("/_authenticated/admin/approvals")({
  component: ApprovalsPage,
});

const tabs = [
  { key: "pending", label: "قيد المراجعة" },
  { key: "approved", label: "مقبولة" },
  { key: "rejected", label: "مرفوضة" },
] as const;

function ApprovalsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof tabs)[number]["key"]>("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-approvals", status],
    queryFn: () => listAccountRequests({ data: { status } }),
  });

  const decide = useMutation({
    mutationFn: (v: { userId: string; status: "approved" | "rejected" }) =>
      setAccountApproval({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "approved" ? "تم قبول الحساب" : "تم رفض الحساب");
      qc.invalidateQueries({ queryKey: ["admin-approvals"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-count"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-black flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" /> طلبات إنشاء الحسابات
        </h1>
        <p className="text-sm text-muted-foreground">
          لا يستطيع الطالب الدخول للمنصة إلا بعد موافقتك على طلبه.
        </p>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={status === t.key ? "default" : "outline"}
            onClick={() => setStatus(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground font-bold">
            لا توجد طلبات هنا.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <StorageAvatar path={s.avatar_url} name={s.full_name} className="h-12 w-12" />
                <div className="flex-1 min-w-0">
                  <p className="font-black truncate">{s.full_name || "بدون اسم"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.phone} • {s.sections?.name ?? "بدون مرحلة"} •{" "}
                    {new Date(s.created_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                {status === "pending" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => decide.mutate({ userId: s.id, status: "approved" })}
                    >
                      <Check className="h-4 w-4" /> قبول
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => decide.mutate({ userId: s.id, status: "rejected" })}
                    >
                      <X className="h-4 w-4" /> رفض
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <Badge variant={s.approval_status === "approved" ? "secondary" : "destructive"}>
                      {s.approval_status === "approved" ? "مقبول" : "مرفوض"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        decide.mutate({
                          userId: s.id,
                          status: s.approval_status === "approved" ? "rejected" : "approved",
                        })
                      }
                    >
                      {s.approval_status === "approved" ? "إلغاء القبول" : "قبول"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

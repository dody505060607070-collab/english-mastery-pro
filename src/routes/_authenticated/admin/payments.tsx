import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Check, X, Receipt, Search } from "lucide-react";
import { toast } from "sonner";
import { listPaymentRequests, decidePaymentRequest } from "@/lib/payments.functions";
import { useMediaUrl } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({
    meta: [
      { title: "طلبات الدفع — لوحة الإدارة" },
      { name: "description", content: "مراجعة إيصالات الدفع وتفعيل اشتراكات الطلاب." },
      { property: "og:title", content: "طلبات الدفع — لوحة الإدارة" },
      { property: "og:description", content: "مراجعة إيصالات الدفع وتفعيل اشتراكات الطلاب." },
    ],
  }),
  component: PaymentsPage,
});

const statusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

function ReceiptPreview({ path }: { path: string }) {
  const url = useMediaUrl(path, "receipts");
  if (!url) return <Loader2 className="h-5 w-5 animate-spin" />;
  return <img src={url} alt="إيصال الدفع" className="max-h-[60vh] w-full rounded-xl border object-contain" />;
}

function PaymentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => listPaymentRequests(),
  });

  const decide = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected" }) =>
      decidePaymentRequest({ data: v }),
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data.filter((r) => {
    const q = search.trim();
    if (!q) return true;
    return (
      (r.student?.full_name ?? "").includes(q) ||
      (r.student?.phone ?? "").includes(q) ||
      (r.sender_phone ?? "").includes(q)
    );
  });

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">طلبات الدفع</h1>
          <p className="text-muted-foreground text-sm">
            {pending.length} طلب بانتظار المراجعة من إجمالي {rows.length}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الطالب أو رقمه"
            className="pr-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <Receipt className="h-10 w-10" />
            <p>لا توجد طلبات دفع حتى الآن.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
                <CardTitle className="text-base font-black">
                  {r.student?.full_name ?? "طالب"}{" "}
                  <span className="text-muted-foreground font-normal" dir="ltr">
                    {r.student?.phone ?? ""}
                  </span>
                </CardTitle>
                <Badge
                  variant={
                    r.status === "approved"
                      ? "default"
                      : r.status === "rejected"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {statusLabel[r.status ?? "pending"]}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">الكورس: </span>
                    {(r.courses as { title?: string } | null)?.title ?? r.plan_name ?? "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">المبلغ: </span>
                    {Number(r.amount).toLocaleString("ar-EG")} جنيه
                  </p>
                  <p>
                    <span className="text-muted-foreground">وسيلة الدفع: </span>
                    {r.payment_method ?? "—"}
                  </p>
                  <p dir="ltr" className="text-start">
                    <span className="text-muted-foreground">من رقم: </span>
                    {r.sender_phone}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreview(r.screenshot_url)}>
                    <Receipt className="h-4 w-4" />
                    <span className="mr-1">عرض الإيصال</span>
                  </Button>
                  {r.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => decide.mutate({ id: r.id, decision: "approved" })}
                        disabled={decide.isPending}
                      >
                        <Check className="h-4 w-4" />
                        <span className="mr-1">قبول وتفعيل</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => decide.mutate({ id: r.id, decision: "rejected" })}
                        disabled={decide.isPending}
                      >
                        <X className="h-4 w-4" />
                        <span className="mr-1">رفض</span>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إيصال الدفع</DialogTitle>
          </DialogHeader>
          {preview && <ReceiptPreview path={preview} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

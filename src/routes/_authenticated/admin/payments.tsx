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
      { title: "Payment Requests — Admin Panel" },
      { name: "description", content: "Review payment receipts and activate student subscriptions." },
      { property: "og:title", content: "Payment Requests — Admin Panel" },
      { property: "og:description", content: "Review payment receipts and activate student subscriptions." },
    ],
  }),
  component: PaymentsPage,
});

const statusLabel: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function ReceiptPreview({ path }: { path: string }) {
  const url = useMediaUrl(path, "receipts");
  if (!url) return <Loader2 className="h-5 w-5 animate-spin" />;
  return <img src={url} alt="Payment Receipt" className="max-h-[60vh] w-full rounded-xl border object-contain" />;
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
      toast.success("Request status updated");
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
    <div className="space-y-6" dir="ltr">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Payment Requests</h1>
          <p className="text-muted-foreground text-sm">
            {pending.length} requests awaiting review out of a total of {rows.length}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or number"
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
            <p>No payment requests yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
                <CardTitle className="text-base font-black">
                  {r.student?.full_name ?? "Student"}{" "}
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
                    <span className="text-muted-foreground">Course: </span>
                    {(r.courses as { title?: string } | null)?.title ?? r.plan_name ?? "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Amount: </span>
                    {Number(r.amount).toLocaleString("en-US")} EGP
                  </p>
                  <p>
                    <span className="text-muted-foreground">Payment method: </span>
                    {r.payment_method ?? "—"}
                  </p>
                  <p dir="ltr" className="text-start">
                    <span className="text-muted-foreground">From number: </span>
                    {r.sender_phone}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPreview(r.screenshot_url)}>
                    <Receipt className="h-4 w-4" />
                    <span className="mr-1">View Receipt</span>
                  </Button>
                  {r.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => decide.mutate({ id: r.id, decision: "approved" })}
                        disabled={decide.isPending}
                      >
                        <Check className="h-4 w-4" />
                        <span className="mr-1">Approve & Activate</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => decide.mutate({ id: r.id, decision: "rejected" })}
                        disabled={decide.isPending}
                      >
                        <X className="h-4 w-4" />
                        <span className="mr-1">Reject</span>
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
        <DialogContent dir="ltr" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {preview && <ReceiptPreview path={preview} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

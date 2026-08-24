import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, CheckCircle2, Clock, ArrowRight, ShieldCheck, Wallet, Phone, Image as ImageIcon, Sparkles, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { uploadFile } from "@/lib/storage";


export const Route = createFileRoute("/_authenticated/subscription")({
  component: SubscriptionPage,
});

const PLANS = [
  {
    name: "خطة أساسية",
    price: 99,
    duration: "شهر",
    features: ["الوصول لجميع الدروس", "ملفات PDF", "اختبارات دورية"],
    color: "from-blue-500/20 to-blue-600/20"
  },
  {
    name: "خطة ذهبية",
    price: 249,
    duration: "3 أشهر",
    features: ["كل مميزات الخطة الأساسية", "شهادة معتمدة", "دعم فني خاص"],
    color: "from-amber-500/20 to-amber-600/20",
    popular: true
  },
  {
    name: "خطة ماسية",
    price: 799,
    duration: "سنة",
    features: ["كل مميزات الخطة الذهبية", "حصص مباشرة", "محتوى حصري"],
    color: "from-purple-500/20 to-purple-600/20"
  }
];

function SubscriptionPage() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Vodafone Cash' | 'InstaPay'>('Vodafone Cash');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["current-subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["subscription-history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const submitPayment = async () => {
    if (!senderPhone || !receiptFile) {
      toast.error("يرجى إدخال رقم الهاتف وإرفاق صورة التحويل");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("يرجى تسجيل الدخول أولاً");
        window.location.href = '/auth';
        return;
      }

      const filePath = await uploadFile("receipts", receiptFile, user.id);

      const { error: requestError } = await supabase
        .from('payment_requests')
        .insert({
          user_id: user.id,
          amount: selectedPlan.price,
          plan_name: selectedPlan.name,
          payment_method: paymentMethod,
          sender_phone: senderPhone,
          screenshot_url: filePath,
          status: 'pending'
        });


      if (requestError) throw requestError;

      toast.success("تم إرسال طلب الترقية بنجاح. سيتم مراجعته خلال 24 ساعة.");
      setShowPayment(false);
      setSelectedPlan(null);
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) return;
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: 'cancelled' })
        .eq("id", subscription.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
      toast.success("تم طلب إلغاء الاشتراك بنجاح");
    }
  });

  if (subLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center font-['Cairo']" dir="rtl">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-muted-foreground">جاري تحميل بيانات الاشتراك...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-['Cairo'] pb-24" dir="rtl">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-[25%] h-[25%] bg-accent/5 rounded-full blur-[80px]" />
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => window.location.href='/profile'} className="gap-2 font-bold">
            <ArrowRight className="h-4 w-4" />
            العودة للملف الشخصي
          </Button>
          <div className="font-black text-xl text-primary">إدارة الاشتراك</div>
        </div>
      </header>

      <main className="container pt-12 max-w-5xl space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black">اشتراكك الحالي</h1>
          <p className="text-muted-foreground font-bold">تحكم في خطتك وعرض تفاصيل الفوترة الخاصة بك</p>
        </div>

        {/* Current Plan Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass border-primary/10 overflow-hidden shadow-2xl">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/20 p-4 rounded-2xl shadow-inner">
                    <CreditCard className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black">{subscription?.plan_name || "لا يوجد اشتراك نشط"}</CardTitle>
                    <CardDescription className="font-bold">
                      {subscription?.status === 'active' ? 'حسابك مفعل الآن' : 'قم بالترقية للحصول على كافة المميزات'}
                    </CardDescription>
                  </div>
                </div>
                {subscription?.status === 'active' && (
                  <Badge className="w-fit text-lg px-6 py-2 rounded-full font-black bg-green-500/10 text-green-600 border-green-500/20">
                    نشط ومفعل
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-8 grid md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <div className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  تاريخ البدء
                </div>
                <div className="text-xl font-black italic">
                  {subscription?.starts_at ? format(new Date(subscription.starts_at), "PPP", { locale: ar }) : "---"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  تاريخ الانتهاء
                </div>
                <div className="text-xl font-black italic">
                  {subscription?.expires_at ? format(new Date(subscription.expires_at), "PPP", { locale: ar }) : "غير محدود"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  حالة الدفع
                </div>
                <div className="text-xl font-black text-green-600 italic">
                  {subscription?.amount_paid} {subscription?.currency}
                </div>
              </div>
            </CardContent>
            {subscription?.status === 'active' && (
              <CardFooter className="bg-muted/30 border-t border-primary/10 pt-6">
                <Button 
                  variant="outline" 
                  className="text-destructive border-destructive/20 hover:bg-destructive/5 font-bold"
                  onClick={() => {
                    if (confirm("هل أنت متأكد من رغبتك في إلغاء الاشتراك؟")) {
                      cancelSubscriptionMutation.mutate();
                    }
                  }}
                  disabled={cancelSubscriptionMutation.isPending}
                >
                  إلغاء الاشتراك الحالي
                </Button>
              </CardFooter>
            )}
          </Card>
        </motion.div>

        {/* Upgrade Plans */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-black flex items-center justify-center gap-3">
              <Sparkles className="h-8 w-8 text-amber-500" />
              قم بترقية حسابك
            </h2>
            <p className="text-muted-foreground font-bold mt-2">اختر الخطة التي تناسب احتياجاتك التعليمية</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {PLANS.map((plan, idx) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -10 }}
              >
                <Card className={cn(
                  "relative h-full flex flex-col overflow-hidden border-primary/10 glass transition-all duration-500",
                  plan.popular && "ring-2 ring-primary shadow-2xl scale-105"
                )}>
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-black rounded-bl-xl z-20">
                      الأكثر طلباً
                    </div>
                  )}
                  <CardHeader className={cn("bg-gradient-to-br border-b border-primary/10", plan.color)}>
                    <CardTitle className="text-2xl font-black text-center">{plan.name}</CardTitle>
                    <div className="mt-4 text-center">
                      <span className="text-4xl font-black">{plan.price}</span>
                      <span className="text-muted-foreground font-bold mr-2">ج.م / {plan.duration}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pt-8 space-y-4">
                    {plan.features.map(feature => (
                      <div key={feature} className="flex items-center gap-3 font-bold text-sm">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="pt-6">
                    <Button 
                      className={cn(
                        "w-full h-12 font-black text-lg rounded-xl shadow-lg transition-all",
                        plan.popular ? "bg-primary shadow-primary/30" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => {
                        setSelectedPlan(plan);
                        setShowPayment(true);
                      }}
                    >
                      اختار الخطة
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Billing History */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">سجل الفواتير والمدفوعات</h2>
            <Badge variant="outline" className="font-bold">{history?.length || 0} عملية</Badge>
          </div>
          <Card className="glass border-primary/10 overflow-hidden shadow-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-primary/5">
                  <TableRow>
                    <TableHead className="text-right font-black">التاريخ</TableHead>
                    <TableHead className="text-right font-black">الخطة</TableHead>
                    <TableHead className="text-right font-black">المبلغ</TableHead>
                    <TableHead className="text-right font-black">الحالة</TableHead>
                    <TableHead className="text-right font-black">الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="animate-pulse flex justify-center space-x-4 space-x-reverse">
                          <div className="h-4 w-48 bg-primary/10 rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : history && history.length > 0 ? (
                    history.map((h) => (
                      <TableRow key={h.id} className="hover:bg-primary/5 transition-colors">
                        <TableCell className="font-bold">{format(new Date(h.created_at || new Date()), "yyyy/MM/dd")}</TableCell>
                        <TableCell className="font-black text-primary">{h.plan_name}</TableCell>
                        <TableCell className="font-black">{h.amount_paid} {h.currency}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={h.status === 'active' ? 'default' : 'secondary'}
                            className={cn(
                              "font-bold",
                              h.status === 'active' && "bg-green-500/10 text-green-600 border-green-500/20",
                              h.status === 'expired' && "bg-red-500/10 text-red-600 border-red-500/20"
                            )}
                          >
                            {h.status === 'active' ? 'ناجحة' : h.status === 'expired' ? 'منتهية' : h.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {h.invoice_url ? (
                            <Button variant="ghost" size="sm" className="font-bold text-primary gap-2" asChild>
                              <a href={h.invoice_url} target="_blank" rel="noopener noreferrer">
                                <ImageIcon className="h-4 w-4" />
                                عرض الفاتورة
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">لا توجد فاتورة</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-24">
                        <div className="flex flex-col items-center gap-4">
                          <AlertCircle className="h-12 w-12 text-muted-foreground/30" />
                          <p className="font-bold text-muted-foreground">لا يوجد سجل مدفوعات لعرضه حالياً</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md font-['Cairo']" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">تأكيد ترقية الحساب</DialogTitle>
            <DialogDescription className="font-bold">
              يرجى تحويل مبلغ {selectedPlan?.price} ج.م لإتمام الاشتراك في {selectedPlan?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="font-bold">طريقة الدفع</Label>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant={paymentMethod === 'Vodafone Cash' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('Vodafone Cash')}
                    className="rounded-lg font-bold"
                  >
                    فودافون كاش
                  </Button>
                  <Button 
                    size="sm"
                    variant={paymentMethod === 'InstaPay' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('InstaPay')}
                    className="rounded-lg font-bold"
                  >
                    انستا باي
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-background/50 backdrop-blur rounded-xl border border-primary/10 shadow-inner">
                <div>
                  <div className="text-[10px] text-muted-foreground font-black uppercase mb-1">رقم المحفظة / العنوان</div>
                  <div className="text-xl font-black tracking-widest text-primary">01016177688</div>
                </div>
                <Button size="sm" variant="ghost" className="hover:bg-primary/10 font-black" onClick={() => {
                  navigator.clipboard.writeText('01016177688');
                  toast.success("تم نسخ الرقم بنجاح");
                }}>نسخ</Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  رقم الهاتف الذي قمت بالتحويل منه
                </Label>
                <Input 
                  placeholder="01xxxxxxxxx" 
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="h-12 rounded-xl border-primary/10 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  صورة إيصال التحويل (Screenshot)
                </Label>
                <div className="relative group">
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="h-12 rounded-xl border-primary/10 cursor-pointer pt-2"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              className="h-12 rounded-xl font-bold" 
              onClick={() => setShowPayment(false)}
            >
              إلغاء
            </Button>
            <Button 
              className="flex-1 h-12 rounded-xl font-black text-lg shadow-lg shadow-primary/20" 
              onClick={submitPayment}
              disabled={isSubmitting}
            >
              {isSubmitting ? "جاري الإرسال..." : "تأكيد وإرسال"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

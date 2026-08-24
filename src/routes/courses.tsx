import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Search, Filter, Star, Users, Globe, ArrowLeft, GraduationCap, Wallet, Phone, Image as ImageIcon, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { useSiteContent, pickText } from "@/lib/content";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "كافة الدورات | Blue Language Academy" },
      { name: "description", content: "تصفح كافة دورات اللغة الإنجليزية المقدمة من Blue Language Academy" },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const { data: siteContent } = useSiteContent();
  const walletNumber = pickText(siteContent?.["payment.wallet"], "ar", "01035851426");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Vodafone Cash' | 'InstaPay'>('Vodafone Cash');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_categories(name, icon)")
        .eq("is_published", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("course_categories").select("*");
      if (error) throw error;
      return data;
    },
  });

  const filteredCourses = courses?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === "all" || course.level === selectedLevel;
    const matchesCategory = selectedCategory === "all" || course.category_id === selectedCategory;
    return matchesSearch && matchesLevel && matchesCategory;
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

      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      const { error: requestError } = await supabase
        .from('payment_requests')
        .insert({
          user_id: user.id,
          course_id: selectedCourse.id,
          amount: selectedCourse.price,
          payment_method: paymentMethod,
          sender_phone: senderPhone,
          screenshot_url: publicUrl.publicUrl,
          status: 'pending'
        });

      if (requestError) throw requestError;

      toast.success("تم إرسال طلب الدفع بنجاح. سيتم مراجعته خلال 24 ساعة.");
      setShowPayment(false);
      setSelectedCourse(null);
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background font-['Cairo']" 
      dir="rtl"
    >
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 font-black text-xl">
             <div className="bg-primary p-1.5 rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
             </div>
             <span>Blue Language Academy</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="font-bold">دخول</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-12 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-black">استكشف كافة الدورات</h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto px-4">
            اختر دورتك التدريبية المفضلة وابدأ رحلة التميز في اللغة الإنجليزية مع أفضل المحاضرين.
          </p>
        </div>

        {/* Filters */}
        <div className="glass p-4 md:p-6 rounded-2xl md:rounded-3xl border-border/40 space-y-6 mx-4 md:mx-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="sm:col-span-2 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="ابحث عن كورس..." 
                className="pr-10 h-12 font-bold"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="h-12 font-bold">
                  <SelectValue placeholder="المستوى" />
                </SelectTrigger>
                <SelectContent className="font-['Cairo']" dir="rtl">
                  <SelectItem value="all">كل المستويات</SelectItem>
                  {['A1.1', 'A1.2', 'A2.1', 'A2.2', 'B1.1', 'B1.2', 'B2.1', 'B2.2', 'C1.1', 'C1.2', 'C2.1', 'C2.2'].map(lvl => (
                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-12 font-bold">
                  <SelectValue placeholder="القسم" />
                </SelectTrigger>
                <SelectContent className="font-['Cairo']" dir="rtl">
                  <SelectItem value="all">كل الأقسام</SelectItem>
                  {categories?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Course Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[400px] rounded-3xl bg-primary/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <AnimatePresence mode="popLayout">
              {filteredCourses?.map((course, idx) => (
                <motion.div
                  key={course.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card 
                    className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-border/40 hover:-translate-y-2 cursor-pointer h-full flex flex-col"
                    onClick={() => setSelectedCourse(course)}
                  >
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      {course.thumbnail_url ? (
                        <img 
                          src={course.thumbnail_url} 
                          alt={course.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                          <BookOpen className="w-16 h-16 text-primary/20" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4 z-20">
                        <span className="bg-background/90 backdrop-blur text-primary text-[10px] font-black uppercase px-2 py-1 rounded shadow-sm">
                          {course.level}
                        </span>
                      </div>
                    </div>
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                         <div className="flex flex-col gap-1">
                           <span className="text-xs font-bold text-primary">{course.course_categories?.name}</span>
                           <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 text-[10px] font-black px-2 py-0.5 rounded-full w-fit">
                             <Zap className="h-2.5 w-2.5" />
                             +500 XP
                           </div>
                         </div>
                         <div className="flex items-center gap-1 text-xs text-yellow-600 font-bold">
                           <Star className="h-3 w-3" fill="currentColor" />
                           4.8
                         </div>
                      </div>
                      <CardTitle className="text-xl font-black group-hover:text-primary transition-colors">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-2">{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                         <div className="flex items-center gap-1">
                           <Users className="h-4 w-4" />
                           1.2k طالب
                         </div>
                         {course.duration_text && (
                           <div className="flex items-center gap-1">
                             <Globe className="h-4 w-4" />
                             {course.duration_text}
                           </div>
                         )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 pb-8 px-6 border-t mt-4 pt-4 flex items-center justify-between">
                      <span className="text-2xl font-black text-foreground">
                        {course.price === 0 ? 'مجاناً' : `${course.price} ج.م`}
                      </span>
                      <Button 
                        className="font-bold shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCourse(course);
                          setShowPayment(true);
                        }}
                      >
                        اشترك الآن
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredCourses?.length === 0 && (
              <div className="col-span-full">
                <EmptyState 
                  title="لا توجد دورات!"
                  description="لم يتم العثور على أي دورات تطابق معايير البحث الحالية. حاول تغيير الفلاتر أو البحث عن شيء آخر."
                  icon="search"
                  actionText="إعادة تعيين البحث"
                  onAction={() => {
                    setSearchQuery("");
                    setSelectedLevel("all");
                    setSelectedCategory("all");
                  }}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reused Payment Dialogs */}
      <Dialog open={!!selectedCourse && !showPayment} onOpenChange={(open) => !open && setSelectedCourse(null)}>
        <DialogContent className="max-w-2xl font-['Cairo']" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{selectedCourse?.title}</DialogTitle>
            <DialogDescription>
              {selectedCourse?.course_categories?.name} • {selectedCourse?.level}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="aspect-video rounded-xl overflow-hidden bg-muted">
              {selectedCourse?.thumbnail_url ? (
                <img src={selectedCourse.thumbnail_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                  <BookOpen size={64} />
                </div>
              )}
            </div>
            <div className="space-y-4">
              <h4 className="text-lg font-bold">عن الكورس</h4>
              <p className="text-muted-foreground leading-relaxed">{selectedCourse?.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border/40">
                  <div className="text-xs text-muted-foreground mb-1">السعر</div>
                  <div className="text-xl font-black">{selectedCourse?.price} ج.م</div>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border/40">
                  <div className="text-xs text-muted-foreground mb-1">المستوى</div>
                  <div className="text-xl font-black">{selectedCourse?.level}</div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 text-lg font-black" onClick={() => setShowPayment(true)}>
              اشترك الآن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-md font-['Cairo']" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">تأكيد الاشتراك</DialogTitle>
            <DialogDescription>
              يرجى تحويل مبلغ {selectedCourse?.price} ج.م لإتمام التسجيل
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="font-bold">طريقة الدفع</Label>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant={paymentMethod === 'Vodafone Cash' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('Vodafone Cash')}
                  >
                    فودافون كاش
                  </Button>
                  <Button 
                    size="sm"
                    variant={paymentMethod === 'InstaPay' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('InstaPay')}
                  >
                    انستا باي
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">رقم المحفظة</div>
                  <div className="text-lg font-black tracking-widest">{walletNumber}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => {
                  navigator.clipboard.writeText(walletNumber);
                  toast.success("تم نسخ الرقم");
                }}>نسخ</Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">الرقم الذي تم التحويل منه</Label>
                <Input placeholder="010XXXXXXXX" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">صورة التحويل (Screenshot)</Label>
                <Input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 text-lg font-black" disabled={isSubmitting} onClick={submitPayment}>
              {isSubmitting ? "جاري الإرسال..." : "تأكيد وإرسال"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

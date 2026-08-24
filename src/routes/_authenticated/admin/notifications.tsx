import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, sendNotification } from "@/utils/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bell, Send, Users, User, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: NotificationsAdmin,
});

function NotificationsAdmin() {
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState<"all" | "single">("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "success" | "warning" | "error">("info");
  const [scheduledFor, setScheduledFor] = useState("");

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => getUsers(),
  });

  const sendNotificationFn = useServerFn(sendNotification);

  const mutation = useMutation({
    mutationFn: (data: { 
      title: string; 
      message: string; 
      type: "info" | "success" | "warning" | "error"; 
      userId?: string; 
      scheduledFor?: string 
    }) => 
      sendNotificationFn({ 
        data: {
          title: data.title,
          message: data.message,
          type: data.type,
          userId: data.userId || undefined,
          scheduledFor: data.scheduledFor || undefined
        } 
      }),
    onSuccess: () => {
      toast.success("تم إرسال الإشعار بنجاح");
      setTitle("");
      setMessage("");
      setScheduledFor("");
      setSelectedUserId("");
    },
    onError: (error) => {
      toast.error("فشل إرسال الإشعار: " + error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error("يرجى إكمال جميع الحقول المطلوبة");
      return;
    }

    const payload: { 
      title: string; 
      message: string; 
      type: "info" | "success" | "warning" | "error"; 
      userId?: string; 
      scheduledFor?: string 
    } = {
      title,
      message,
      type,
    };

    if (targetType === "single" && selectedUserId) {
      payload.userId = selectedUserId;
    }

    if (scheduledFor) {
      payload.scheduledFor = scheduledFor;
    }

    mutation.mutate(payload);
  };

  return (
    <div className="space-y-8 font-['Cairo']" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إدارة الإشعارات</h1>
          <p className="text-muted-foreground">أرسل تنبيهات وإشعارات للطلاب والمستخدمين</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="glass overflow-hidden border-none shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                إرسال إشعار جديد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>المستهدفين</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={targetType === "all" ? "default" : "outline"}
                        className="flex-1 rounded-xl"
                        onClick={() => setTargetType("all")}
                      >
                        <Users className="ml-2 h-4 w-4" />
                        جميع الطلاب
                      </Button>
                      <Button
                        type="button"
                        variant={targetType === "single" ? "default" : "outline"}
                        className="flex-1 rounded-xl"
                        onClick={() => setTargetType("single")}
                      >
                        <User className="ml-2 h-4 w-4" />
                        مستخدم محدد
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {targetType === "single" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                      >
                        <Label>اختر المستخدم</Label>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                          <SelectTrigger className="rounded-xl glass border-white/20">
                            <SelectValue placeholder="بحث عن مستخدم..." />
                          </SelectTrigger>
                          <SelectContent className="glass border-white/20">
                            {users?.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || user.phone} ({user.phone})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">عنوان الإشعار</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: تحديث جديد في الكورس"
                    className="rounded-xl glass border-white/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">محتوى الإشعار</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="اكتب تفاصيل الإشعار هنا..."
                    rows={4}
                    className="rounded-xl glass border-white/20"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>نوع الإشعار</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                      <SelectTrigger className="rounded-xl glass border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass border-white/20">
                        <SelectItem value="info">معلومة (أزرق)</SelectItem>
                        <SelectItem value="success">نجاح (أخضر)</SelectItem>
                        <SelectItem value="warning">تنبيه (أصفر)</SelectItem>
                        <SelectItem value="error">خطأ (أحمر)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled">توقيت الإرسال (اختياري)</Label>
                    <div className="relative">
                      <Input
                        id="scheduled"
                        type="datetime-local"
                        value={scheduledFor}
                        onChange={(e) => setScheduledFor(e.target.value)}
                        className="rounded-xl glass border-white/20 pl-10"
                      />
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full rounded-xl py-6 text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "جاري الإرسال..." : "إرسال الآن"}
                  <Send className="mr-2 h-5 w-5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">نصائح للإرسال</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <p>استخدم عناوين واضحة وجذابة لجذب انتباه الطلاب.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <p>تجنب الإرسال المتكرر للإشعارات حتى لا ينزعج المستخدمون.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <p>يمكنك جدولة الإشعارات ليتم إرسالها في وقت ذروة نشاط الطلاب.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-none shadow-xl bg-primary/5">
            <CardContent className="p-6 text-center space-y-2">
              <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold">إجمالي المستخدمين</h3>
              <p className="text-3xl font-black text-primary">{users?.length || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

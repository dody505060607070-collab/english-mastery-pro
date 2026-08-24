import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  Plus, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  component: AdminRoles,
});

function AdminRoles() {
  const { data: roles } = useQuery({
    queryKey: ["admin-roles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from('role_permissions').select('role, permissions(name)');
      if (error) throw error;
      return data;
    }
  });

  const availableRoles = [
    { name: 'super_admin', label: 'مدير خارق', color: 'bg-red-500', desc: 'تحكم كامل في النظام وجميع الصلاحيات.' },
    { name: 'admin', label: 'مدير', color: 'bg-orange-500', desc: 'إدارة الكورسات والمستخدمين والتقارير.' },
    { name: 'teacher', label: 'مدرس', color: 'bg-blue-500', desc: 'إدارة المحتوى التعليمي والطلاب والكلمات.' },
    { name: 'editor', label: 'محرر', color: 'bg-purple-500', desc: 'إضافة وتعديل الكلمات والمقالات.' },
    { name: 'student', label: 'طالب', color: 'bg-slate-500', desc: 'الوصول للمحتوى التعليمي والدروس.' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-['Cairo']" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">الأدوار والصلاحيات</h1>
          <p className="text-muted-foreground text-sm">تحديد ما يمكن لكل نوع من المستخدمين القيام به.</p>
        </div>
        <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20" variant="outline">
          <ShieldAlert className="h-4 w-4" />
          تعديل الصلاحيات
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableRoles.map((role) => (
          <Card key={role.name} className="glass border-white/20 overflow-hidden relative group">
            <div className={`absolute top-0 right-0 w-1 h-full ${role.color}`} />
            <CardHeader>
              <div className="flex justify-between items-start">
                <Badge className={`${role.color} hover:${role.color} border-none`}>{role.label}</Badge>
                <Lock className="h-4 w-4 text-muted-foreground opacity-20" />
              </div>
              <CardTitle className="text-lg mt-2">{role.name}</CardTitle>
              <CardDescription className="text-xs min-h-[32px]">{role.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">الصلاحيات النشطة</p>
                <div className="flex flex-wrap gap-1">
                  {role.name === 'super_admin' ? (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      كل الصلاحيات
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="secondary" className="text-[10px]">إدارة الكورسات</Badge>
                      <Badge variant="secondary" className="text-[10px]">إدارة الطلاب</Badge>
                      <Badge variant="secondary" className="text-[10px]">عرض التقارير</Badge>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass border-white/20 bg-amber-500/5 border-amber-500/20">
        <CardContent className="p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-amber-500 shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-700 dark:text-amber-400">تنبيه أمني</h4>
            <p className="text-sm text-amber-600 dark:text-amber-500/80 leading-relaxed">
              تعديل الصلاحيات يؤثر بشكل فوري على جميع المستخدمين المرتبطين بهذا الدور. يرجى الحذر عند سحب صلاحيات أساسية لتجنب تعطل العمليات.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

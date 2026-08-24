import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Layers, BookOpen, FileText, UserX, GraduationCap, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StorageAvatar } from "@/components/StorageAvatar";
import { getDashboardStats } from "@/lib/admin-manage.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getDashboardStats(),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { title: "إجمالي الطلاب", value: data.totalStudents, icon: Users, tone: "text-primary" },
    { title: "طلاب نشطون", value: data.activeStudents, icon: GraduationCap, tone: "text-emerald-600" },
    { title: "طلاب محظورون", value: data.blockedStudents, icon: UserX, tone: "text-destructive" },
    { title: "المراحل", value: data.sections, icon: Layers, tone: "text-primary" },
    { title: "الوحدات", value: data.units, icon: BookOpen, tone: "text-primary" },
    { title: "عناصر المحتوى", value: data.contents, icon: FileText, tone: "text-primary" },
  ];

  return (
    <div className="space-y-8" dir="rtl">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.title} className="border-border/60">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-1">{c.title}</p>
                <p className="text-3xl font-black">{c.value}</p>
              </div>
              <c.icon className={`h-8 w-8 ${c.tone} opacity-70`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/admin/students">إدارة الطلاب</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/sections">إدارة المراحل والوحدات</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-black">أحدث الطلاب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recentStudents.length === 0 && (
            <p className="text-sm text-muted-foreground">لا يوجد طلاب مسجلون بعد.</p>
          )}
          {data.recentStudents.map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
              <StorageAvatar path={s.avatar_url} name={s.full_name} className="h-11 w-11" />
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{s.full_name || "بدون اسم"}</p>
                <p className="text-xs text-muted-foreground">
                  {s.phone} • {s.sections?.name ?? "بدون مرحلة"}
                </p>
              </div>
              {s.is_blocked ? (
                <Badge variant="destructive">محظور</Badge>
              ) : (
                <Badge variant="secondary">نشط</Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

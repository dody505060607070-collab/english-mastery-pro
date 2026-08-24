import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ArrowLeft, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getMyCurriculum } from "@/lib/curriculum.functions";

export function MyCurriculumCard() {
  const { data } = useQuery({
    queryKey: ["my-curriculum"],
    queryFn: () => getMyCurriculum(),
  });

  if (!data) return null;

  if (!data.section) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 flex items-center gap-4">
          <Layers className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-black">لم يتم تحديد مرحلتك الدراسية بعد</p>
            <p className="text-sm text-muted-foreground">تواصل مع الإدارة لتفعيل وحداتك الدراسية.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const next = data.units.find((u) => u.progress < 100) ?? data.units[0];

  return (
    <Card className="border-primary/20 bg-gradient-to-l from-primary/10 to-transparent rounded-[2rem]">
      <CardContent className="p-6 md:p-8 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-primary/15 text-primary p-3 rounded-2xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary">مرحلتك الدراسية</p>
              <h2 className="text-2xl font-black">{(data.section as any).name}</h2>
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-primary">{data.overallProgress}%</p>
            <p className="text-[11px] font-bold text-muted-foreground">نسبة الإنجاز</p>
          </div>
        </div>

        <Progress value={data.overallProgress} className="h-3" />

        <div className="flex flex-wrap gap-3">
          <Button asChild className="font-black">
            <Link to="/learn">
              عرض كل الوحدات
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Link>
          </Button>
          {next && (
            <Button variant="outline" asChild className="font-black">
              <Link to="/learn/$unitId" params={{ unitId: next.id }}>
                متابعة: {next.title}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

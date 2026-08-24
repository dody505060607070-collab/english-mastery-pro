import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { grantXP } from "@/utils/gamification.functions";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Circle, PlayCircle, FileText, LayoutDashboard, Award, Download, GraduationCap, ArrowLeft, ArrowRight, Lightbulb, BookOpen, Headphones, Eye, Type, Activity, ClipboardCheck, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { motion } from "framer-motion";

const LESSON_TYPES = [
  { value: 'Grammar', label: 'قواعد', icon: BookOpen },
  { value: 'Listening', label: 'استماع', icon: Headphones },
  { value: 'Reading', label: 'قراءة', icon: Eye },
  { value: 'Vocabulary', label: 'كلمات', icon: Type },
  { value: 'Practice', label: 'تدريب', icon: Activity },
  { value: 'Tasks', label: 'مهام', icon: ClipboardCheck },
  { value: 'Test', label: 'اختبار', icon: FileText },
];

export const Route = createFileRoute("/_authenticated/course/$courseId")({
  component: CourseViewer,
});

function CourseViewer() {
  const { courseId } = Route.useParams();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const grantXPFn = useServerFn(grantXP);
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: userProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    }
  });

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return null;
      }
      
      const { data: courseData } = await supabase.from("courses").select("*").eq("id", courseId).single();
      
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!enrollment) {
        toast.error("يجب الاشتراك في الكورس أولاً للوصول إلى المحتوى");
        window.location.href = '/';
        return null;
      }

      return courseData;
    }
  });

  const { data: units } = useQuery({
    queryKey: ["units", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("units")
        .select("*, lessons(*)")
        .eq("course_id", courseId)
        .order("order_index");
      
      if (data && data.length > 0 && !activeLessonId) {
        const firstUnit = data[0];
        if (firstUnit && Array.isArray(firstUnit.lessons)) {
          const firstLesson = [...firstUnit.lessons].sort((a: any, b: any) => a.order_index - b.order_index)[0];
          if (firstLesson) setActiveLessonId(firstLesson.id);
        }
      }
      return data;
    }
  });

  const lessons = units?.flatMap(u => u.lessons || []).sort((a: any, b: any) => {
    const unitA = units?.find(u => u.id === a.unit_id);
    const unitB = units?.find(u => u.id === b.unit_id);
    if (unitA?.order_index !== unitB?.order_index) {
      return (unitA?.order_index || 0) - (unitB?.order_index || 0);
    }
    return a.order_index - b.order_index;
  });

  const { data: progress } = useQuery({
    queryKey: ["progress", courseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("user_progress").select("*").eq("course_id", courseId).eq("user_id", user.id);
      return data || [];
    }
  });

  const completeMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error: progressError } = await supabase.from("user_progress").upsert({
        user_id: user.id,
        course_id: courseId,
        lesson_id: lessonId,
        is_completed: true,
        last_accessed_at: new Date().toISOString()
      });

      if (progressError) throw progressError;

      // Grant XP for completing a lesson (amount decided server-side)
      try {
        await grantXPFn({
          data: {
            reason: "lesson_complete",
            note: lessons?.find(l => l.id === lessonId)?.title || lessonId,
          },
        });
      } catch (xpError) {
        console.error("Failed to grant XP:", xpError);
      }

      // Check if this was the last lesson to complete the course
      const { data: allLessons } = await supabase.from("lessons").select("id").eq("course_id", courseId);
      const { data: completedLessons } = await supabase.from("user_progress")
        .select("lesson_id")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .eq("is_completed", true);

      if (allLessons && completedLessons && allLessons.length === completedLessons.length) {
        // Course completed: the database verifies completion before issuing the certificate.
        const { error: certError } = await supabase.rpc("issue_certificate", { _course_id: courseId } as never);
        if (certError) console.error("Failed to issue certificate:", certError.message);

        // Grant bonus XP for course completion
        try {
          await grantXPFn({
            data: {
              reason: "course_complete",
              note: course?.title,
            },
          });
        } catch (xpError) {
          console.error("Failed to grant bonus XP:", xpError);
        }

        
        toast.success("تهانينا! لقد أكملت الكورس وحصلت على شهادة 🎉");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress", courseId] });
      queryClient.invalidateQueries({ queryKey: ["enrollments-with-progress"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      toast.success("تم تحديد الدرس كمكتمل");
    }
  });

  const activeLessonIndex = lessons?.findIndex(l => l.id === activeLessonId) ?? -1;
  const activeLesson = lessons?.[activeLessonIndex];
  const isCompleted = (lessonId: string) => progress?.some(p => p.lesson_id === lessonId && p.is_completed);
  const totalProgress = Math.round(((progress?.length || 0) / (lessons?.length || 1)) * 100);
  const isCourseFinished = totalProgress === 100;

  const goToNextLesson = () => {
    const next = lessons?.[activeLessonIndex + 1];
    if (next) {
      setActiveLessonId(next.id);
    }
  };

  const goToPrevLesson = () => {
    const prev = lessons?.[activeLessonIndex - 1];
    if (prev) {
      setActiveLessonId(prev.id);
    }
  };

  const downloadCertificate = async () => {
    if (!certificateRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`شهادة-إتمام-${course?.title}.pdf`);
      toast.success("تم تحميل الشهادة بنجاح");
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء تحميل الشهادة");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isCourseLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background font-['Cairo']" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xl font-black text-primary">جاري التحقق من الاشتراك...</p>
        </div>
      </div>
    );
  }

  return (

    <div className="flex h-[calc(100-4rem)] bg-background relative" dir="rtl">
      {/* Hidden Certificate Template */}
      <div className="fixed left-[-9999px] top-[-9999px]">
        <div 
          ref={certificateRef}
          className="w-[842px] h-[595px] bg-white p-12 border-[20px] border-primary flex flex-col items-center justify-center text-center font-['Cairo']"
          style={{ direction: 'rtl' }}
        >
          <div className="border-[2px] border-primary/20 w-full h-full flex flex-col items-center justify-center p-8 relative">
            <Award className="w-24 h-24 text-primary mb-6" />
            <h1 className="text-5xl font-black text-primary mb-4">شهادة إتمام</h1>
            <p className="text-xl text-muted-foreground mb-8">نشهد بأن الطالب:</p>
            <h2 className="text-4xl font-black mb-8 border-b-2 border-primary/30 pb-2 px-12">
              {userProfile?.full_name || userProfile?.phone || "طالب الأكاديمية"}
            </h2>
            <p className="text-xl text-muted-foreground mb-4">قد أكمل بنجاح كورس:</p>
            <h3 className="text-3xl font-bold text-primary mb-12">{course?.title}</h3>
            
            <div className="flex justify-between w-full mt-8 px-12">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">التاريخ:</p>
                <p className="font-bold">{new Date().toLocaleDateString('ar-EG')}</p>
              </div>
              <div className="text-left">
                <p className="text-sm text-muted-foreground">ختم الأكاديمية:</p>
                <div className="w-20 h-20 border-4 border-primary rounded-full flex items-center justify-center rotate-12 opacity-50 mt-2">
                   <GraduationCap className="w-10 h-10 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-80 border-l flex flex-col bg-muted/30 backdrop-blur-xl font-['Cairo']">
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center gap-2 font-black text-primary">
            <GraduationCap className="h-5 w-5" />
            <span className="text-sm">Blue Language Academy</span>
          </div>
          <h2 className="font-black text-lg leading-tight">{course?.title}</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
               <span>مستوى التقدم</span>
               <span>{totalProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${totalProgress}%` }}
                className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
              />
            </div>
          </div>
          {isCourseFinished && (
            <Button 
              className="w-full h-11 font-black gap-2 shadow-lg shadow-primary/20 animate-in zoom-in-95"
              onClick={downloadCertificate}
              disabled={isGenerating}
            >
              <Download className="h-4 w-4" />
              {isGenerating ? "جاري التحميل..." : "تحميل الشهادة"}
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {units?.map((unit) => (
              <div key={unit.id} className="space-y-2">
                <div className="flex items-center gap-2 px-2 py-1">
                  <ChevronDown className="h-4 w-4 text-primary" />
                  <h3 className="font-black text-sm text-primary">{unit.title}</h3>
                </div>
                <div className="space-y-1">
                  {unit.lessons?.sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any) => {
                    const TypeIcon = LESSON_TYPES.find(t => t.value === lesson.lesson_type)?.icon || PlayCircle;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl text-xs text-right transition-all duration-300 font-bold",
                          activeLessonId === lesson.id 
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]" 
                            : "hover:bg-primary/5 text-muted-foreground hover:text-primary"
                        )}
                      >
                        {isCompleted(lesson.id) ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                        ) : (
                          <TypeIcon className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="flex-1 truncate">{lesson.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Content Area */}
      <main className="flex-1 flex flex-col">
        {activeLesson ? (
          <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto p-8 space-y-8 text-right">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">{activeLesson.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><PlayCircle className="h-4 w-4" /> درس فيديو</span>
                  <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> مصادر إضافية</span>
                </div>
              </div>

              {activeLesson.video_url && (
                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-xl">
                  {/* Video player placeholder */}
                  <div className="w-full h-full flex items-center justify-center text-white">
                    فيديو الدرس
                  </div>
                </div>
              )}

              <div className="prose prose-blue max-w-none dark:prose-invert">
                {activeLesson.content}
              </div>

              {/* Grammar Tips / Related Content Placeholder */}
              <Card className="bg-primary/5 border-primary/20 border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    نصيحة سريعة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    تأكد من تكرار الجمل بصوت عالٍ لتحسين نطقك. يمكنك دائماً العودة إلى قسم التدريب لممارسة الكلمات الجديدة التي تعلمتها اليوم.
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center pt-8 border-t">
                 <Button 
                   variant="outline" 
                   onClick={goToPrevLesson}
                   disabled={activeLessonIndex <= 0}
                 >
                   <ArrowRight className="ml-2 h-4 w-4" />
                   الدرس السابق
                 </Button>
                 <div className="flex gap-2">
                   <Button 
                     onClick={() => completeMutation.mutate(activeLesson.id)}
                     disabled={isCompleted(activeLesson.id) || completeMutation.isPending}
                   >
                     {isCompleted(activeLesson.id) ? "مكتمل ✓" : "تحديد كمكتمل"}
                   </Button>
                   {activeLessonIndex < (lessons?.length || 0) - 1 && (
                     <Button variant="secondary" onClick={goToNextLesson}>
                       Next Lesson
                       <ArrowLeft className="mr-2 h-4 w-4" />
                     </Button>
                   )}
                 </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            اختر درساً للبدء
          </div>
        )}
      </main>
    </div>
  );
}

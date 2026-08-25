import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Trophy, 
  Star, 
  GraduationCap, 
  BookOpen, 
  Languages, 
  Headphones, 
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { ThreeDCard } from "@/components/ThreeDEffects";
import { PracticeSkeleton } from "@/components/PracticeSkeleton";
import { submitPlacementTest } from "@/utils/placementTest.functions";
import { getPlacementQuestions } from "@/lib/placement-questions.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const Route = createFileRoute("/_authenticated/placement-test")({
  component: PlacementTestPage,
});

function PlacementTestPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const navigate = useNavigate();

  const fetchQuestions = useServerFn(getPlacementQuestions);
  const { data: questions, isLoading } = useQuery({
    queryKey: ["placement_questions"],
    queryFn: () => fetchQuestions({}),
  });

  const mutation = useMutation({
    mutationFn: async (payload: { answers: any[] }) => {
      const result = await submitPlacementTest({ data: payload });
      return result;
    },
    onSuccess: (data) => {
      setResultData(data);
      setShowResult(true);
      toast.success("تم إكمال الاختبار بنجاح! تم تحديد مستواك.");
    },
    onError: () => {
      toast.error("فشل إرسال الاختبار. يرجى المحاولة مرة أخرى.");
    }
  });

  if (isLoading) return <PracticeSkeleton />;
  if (!questions || questions.length === 0) return null;

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const nextQuestion = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Submit
      const payload = Object.entries(answers).map(([id, answer]) => ({
        questionId: id,
        answer,
        category: questions.find((q: { id: string; category: string }) => q.id === id)?.category || "grammar"
      }));
      mutation.mutate({ answers: payload });
    }
  };

  const prevQuestion = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  if (showResult && resultData) {
    const chartData = [
      { name: 'Vocabulary', value: resultData.categoryResults.vocabulary.correct },
      { name: 'Grammar', value: resultData.categoryResults.grammar.correct },
      { name: 'Reading', value: resultData.categoryResults.reading.correct },
      { name: 'Listening', value: resultData.categoryResults.listening.correct },
    ];
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

    return (
      <div className="min-h-screen bg-background py-12 px-4 font-['Cairo']" dir="rtl">
        <div className="container max-w-4xl mx-auto space-y-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-6">
              <Trophy className="h-12 w-12 text-primary animate-bounce" />
            </div>
            <h1 className="text-4xl font-black">تهانينا! لقد أنهيت الاختبار</h1>
            <p className="text-xl text-muted-foreground">تم تحديد مستواك الدراسي بناءً على إجاباتك</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ThreeDCard className="p-8 text-center space-y-6 flex flex-col items-center justify-center min-h-[400px]">
              <div className="relative">
                <div className="w-48 h-48 rounded-full border-8 border-primary/20 flex items-center justify-center">
                  <span className="text-7xl font-black text-primary">{resultData.level}</span>
                </div>
                <div className="absolute -top-4 -right-4 bg-accent p-3 rounded-full shadow-lg">
                  <Star className="h-6 w-6 text-white fill-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold">مستواك الحالي</h3>
              <p className="text-muted-foreground">أنت الآن جاهز لبدء رحلتك التعليمية في هذا المستوى</p>
              <Button size="lg" className="w-full rounded-2xl h-14 font-black text-lg" onClick={() => navigate({ to: "/dashboard" })}>
                اذهب إلى لوحة التحكم
                <ArrowRight className="mr-2 h-6 w-6" />
              </Button>
            </ThreeDCard>

            <ThreeDCard className="p-8 space-y-6 min-h-[400px]">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                تحليل الأداء
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || '#3B82F6'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {chartData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-sm font-bold">{item.name}</span>
                  </div>
                ))}
              </div>
            </ThreeDCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-green-500/5 border-green-500/20 rounded-3xl p-8">
              <h4 className="text-xl font-bold text-green-600 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" />
                نقاط القوة
              </h4>
              <ul className="space-y-3">
                {resultData.strengths.map((s: string) => (
                  <li key={s} className="flex items-center gap-2 text-green-700 font-medium">
                    • {s}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="bg-red-500/5 border-red-500/20 rounded-3xl p-8">
              <h4 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                نقاط الضعف
              </h4>
              <ul className="space-y-3">
                {resultData.weaknesses.map((w: string) => (
                  <li key={w} className="flex items-center gap-2 text-red-700 font-medium">
                    • {w}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const categoryIcons = {
    grammar: <BookOpen className="h-5 w-5" />,
    vocabulary: <Languages className="h-5 w-5" />,
    reading: <MessageSquare className="h-5 w-5" />,
    listening: <Headphones className="h-5 w-5" />,
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 font-['Cairo']" dir="rtl">
      <div className="container max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black">اختبار تحديد المستوى</h1>
              <p className="text-sm text-muted-foreground font-bold">أجب على الأسئلة بدقة</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-primary">{currentStep + 1}</span>
            <span className="text-muted-foreground font-bold mx-1">/</span>
            <span className="text-muted-foreground font-bold">{questions.length}</span>
          </div>
        </div>

        <Progress value={progress} className="h-3 rounded-full bg-primary/10" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {currentQuestion && (
              <ThreeDCard className="p-8 border-primary/20 shadow-2xl space-y-8">
              <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full w-fit">
                {categoryIcons[currentQuestion.category as keyof typeof categoryIcons]}
                <span className="text-sm font-black text-accent uppercase tracking-wider">{currentQuestion.category}</span>
              </div>

              {currentQuestion.reading_passage && (
                <div className="p-6 bg-muted rounded-2xl text-lg leading-relaxed mb-6 font-medium border-r-4 border-primary">
                  {currentQuestion.reading_passage}
                </div>
              )}

              {currentQuestion.audio_url && (
                <div className="mb-6 p-4 bg-muted rounded-2xl border-2 border-dashed border-primary/30">
                  <audio key={currentQuestion.audio_url} controls className="w-full">
                    <source src={currentQuestion.audio_url} type="audio/mpeg" />
                    متصفحك لا يدعم تشغيل الصوت.
                  </audio>
                </div>
              )}

              <h2 className="text-2xl font-bold leading-tight">{currentQuestion.question}</h2>

              <div className="grid gap-4">
                {(currentQuestion.options as string[]).map((option: string) => (
                  <Button
                    key={option}
                    variant={answers[currentQuestion.id] === option ? "default" : "outline"}
                    className={`h-16 px-6 justify-start text-lg font-bold rounded-2xl border-2 transition-all ${
                      answers[currentQuestion.id] === option 
                        ? "shadow-lg shadow-primary/20 scale-[1.02]" 
                        : "hover:bg-primary/5 hover:border-primary/30"
                    }`}
                    onClick={() => handleAnswer(currentQuestion.id, option)}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 ml-4 flex items-center justify-center ${
                      answers[currentQuestion.id] === option ? "bg-white border-white" : "border-muted-foreground/30"
                    }`}>
                      {answers[currentQuestion.id] === option && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    {option}
                  </Button>
                ))}
              </div>
            </ThreeDCard>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            size="lg"
            className="h-14 px-8 rounded-2xl font-black text-muted-foreground hover:bg-muted"
            onClick={prevQuestion}
            disabled={currentStep === 0}
          >
            <ChevronRight className="ml-2 h-5 w-5" />
            Previous
          </Button>

          <Button
            size="lg"
            className="h-14 px-12 rounded-2xl font-black shadow-xl shadow-primary/20 group relative overflow-hidden"
            onClick={nextQuestion}
            disabled={!currentQuestion || !answers[currentQuestion.id] || mutation.isPending}
          >
            <span className="relative z-10 flex items-center">
              {mutation.isPending ? "جاري الإرسال..." : (currentStep === questions.length - 1 ? "إنهاء الاختبار" : "Next")}
              {currentStep < questions.length - 1 && <ChevronLeft className="mr-2 h-5 w-5" />}
            </span>
            <div className="absolute inset-0 bg-primary-foreground/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </Button>
        </div>
      </div>
    </div>
  );
}

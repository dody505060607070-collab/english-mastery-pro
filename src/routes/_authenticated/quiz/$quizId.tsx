import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trophy, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quiz/$quizId")({
  component: QuizPage,
});

function QuizPage() {
  const { quizId } = Route.useParams();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const { data: quiz } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("id", quizId).single();
      return data;
    }
  });

  const { data: questions } = useQuery({
    queryKey: ["questions", quizId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_quiz_questions", { _quiz_id: quizId });
      if (error) throw error;
      return data || [];
    }
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("submit_quiz_attempt", {
        _quiz_id: quizId,
        _answers: answers,
      });
      if (error) throw error;
      return data?.[0]?.score ?? 0;
    },
    onSuccess: (correctCount) => {
      setScore(correctCount || 0);
      setSubmitted(true);
      toast.success("تم تسليم الاختبار بنجاح");
    },
    onError: () => {
      toast.error("تعذر تسليم الاختبار");
    }
  });


  if (submitted) {
    const percentage = Math.round((score / (questions?.length || 1)) * 100);
    const isSuccess = percentage >= 50;
    
    return (
      <div className="container max-w-2xl py-20 text-center space-y-8 font-['Cairo'] animate-in zoom-in-95 duration-500" dir="rtl">
        <div className="flex justify-center relative">
          <div className={cn(
            "absolute inset-0 blur-3xl opacity-20 rounded-full",
            isSuccess ? "bg-primary" : "bg-destructive"
          )} />
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12 }}
          >
            <Trophy className={cn("h-32 w-32 relative z-10", isSuccess ? "text-yellow-500" : "text-muted")} />
          </motion.div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-black">{isSuccess ? "عمل رائع! تهانينا" : "حاول مرة أخرى"}</h1>
          <p className="text-2xl text-muted-foreground font-bold">نتيجتك: {score} من {questions?.length}</p>
        </div>

        <div className="relative h-6 bg-muted rounded-full overflow-hidden shadow-inner max-w-md mx-auto">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn("h-full", isSuccess ? "bg-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]" : "bg-destructive")}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-foreground drop-shadow-sm">
            {percentage}%
          </span>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="h-14 px-10 text-xl font-black shadow-xl shadow-primary/20" onClick={() => window.history.back()}>
            العودة للدرس
          </Button>
          {!isSuccess && (
            <Button size="lg" variant="outline" className="h-14 px-10 text-xl font-black" onClick={() => window.location.reload()}>
              إعادة الاختبار
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-12 space-y-8" dir="rtl">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{quiz?.title}</h1>
        <p className="text-muted-foreground">أجب على جميع الأسئلة بعناية</p>
      </div>

      {questions?.map((q, idx) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle className="text-lg">سؤال {idx + 1}: {q.question_text}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
              className="space-y-3"
            >
              {(q.options as string[])?.map((option) => (
                <div key={option} className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value={option} id={`${q.id}-${option}`} />
                  <Label htmlFor={`${q.id}-${option}`} className="cursor-pointer">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center pt-8">
        <Button 
          size="lg" 
          className="px-12"
          disabled={Object.keys(answers).length < (questions?.length || 0) || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          {submitMutation.isPending ? "جاري التسليم..." : "تسليم الإجابات"}
        </Button>
      </div>
    </div>
  );
}

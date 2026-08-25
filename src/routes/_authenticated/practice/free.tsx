import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ChevronRight, ChevronLeft, BookOpen, Mic, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePronunciation } from "@/hooks/usePronunciation";
import { ThreeDCard } from "@/components/ThreeDEffects";
import { PracticeSkeleton } from "@/components/PracticeSkeleton";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/practice/free")({
  component: FreePractice,
});

function FreePractice() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { speak, isSpeaking } = useTextToSpeech();
  const [showHistory, setShowHistory] = useState(false);
  
  const { data: vocab, isLoading } = useQuery({
    queryKey: ["vocabulary", "free"],
    staleTime: 1000 * 60 * 30, // 30 minutes for vocabulary
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("*")
        .eq("is_premium", false);
      if (error) throw error;
      return data;
    }
  });

  const currentItem = vocab ? vocab[currentIndex] : null;
  const { isRecording, startRecording, result } = usePronunciation(currentItem?.word || "");

  const { data: attempts, refetch: refetchAttempts } = useQuery({
    queryKey: ["pronunciation_attempts", currentItem?.id],
    enabled: !!currentItem?.id,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("pronunciation_attempts")
        .select("*")
        .eq("word_id", currentItem!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (result && currentItem) {
      saveAttempt();
    }
  }, [result]);

  const saveAttempt = async () => {
    if (!result || !currentItem) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("pronunciation_attempts")
      .insert({
        user_id: user.id,
        word_id: currentItem.id,
        spoken_text: result.transcript,
        target_text: currentItem.word,
        score: result.score,
        feedback: result.feedback
      });

    if (error) {
      console.error("Error saving attempt:", error);
    } else {
      refetchAttempts();
    }
  };

  const nextWord = () => {
    if (vocab && currentIndex < vocab.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (isLoading) return <PracticeSkeleton />;
  if (!vocab || vocab.length === 0) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <EmptyState 
        title="لا توجد كلمات!"
        description="لا توجد كلمات متاحة في قسم التدريب المجاني حالياً. يرجى مراجعة قسم التدريب الاحترافي أو العودة لاحقاً."
        icon="book"
        actionText="العودة للرئيسية"
        onAction={() => window.location.href = '/'}
      />
    </div>
  );

  const current = vocab[currentIndex];
  if (!current) return <div className="min-h-screen flex items-center justify-center font-bold text-2xl">خطأ في تحميل الكلمة.</div>;

  return (
    <AnimatePresence>
      <div className="min-h-screen bg-background py-12 px-4 font-['Cairo']" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="container max-w-4xl mx-auto space-y-12"
        >
          <div className="flex items-center justify-between">
            <Button variant="ghost" className="font-bold" onClick={() => window.history.back()}>
              <ChevronRight className="ml-2 h-5 w-5" />
              رجوع
            </Button>
            <div className="text-lg font-black text-primary">
              {currentIndex + 1} / {vocab.length}
            </div>
          </div>

          <div className="relative h-[400px] md:h-[500px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 100, rotateY: -20 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: -100, rotateY: 20 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-full max-w-lg px-4"
              >
                <ThreeDCard className="p-8 md:p-12 text-center space-y-6 md:space-y-8 min-h-[350px] md:min-h-[400px] flex flex-col justify-center border-primary/20 shadow-2xl shadow-primary/10">
                  <div className="space-y-2">
                    <span className="text-primary font-bold text-xs md:text-sm uppercase tracking-widest">المفردات</span>
                    <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-foreground break-words">
                      {current.word}
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="text-3xl font-bold text-muted-foreground bg-muted/50 py-3 rounded-2xl">
                      {current.translation}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-6 pt-4">
                    <div className="flex justify-center gap-6">
                      <Button 
                        size="lg" 
                        className={cn(
                          "h-16 w-16 md:h-20 md:w-20 rounded-full shadow-2xl transition-all duration-300",
                          isSpeaking ? "bg-accent scale-110" : "bg-primary hover:scale-110"
                        )}
                        onClick={() => speak(current.word)}
                      >
                        <Volume2 className={cn("h-8 w-8 md:h-10 md:w-10", isSpeaking && "animate-pulse")} />
                      </Button>
                      
                      <Button 
                        size="lg" 
                        className={cn(
                          "h-16 w-16 md:h-20 md:w-20 rounded-full shadow-2xl transition-all duration-300",
                          isRecording ? "bg-red-500 scale-125 animate-pulse" : "bg-secondary hover:bg-secondary/80 hover:scale-110"
                        )}
                        onClick={startRecording}
                      >
                        <Mic className={cn("h-8 w-8 md:h-10 md:w-10", isRecording ? "text-white" : "text-foreground")} />
                      </Button>
                    </div>

                    <AnimatePresence>
                      {result && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-full space-y-2 p-4 rounded-2xl bg-muted/50 border border-primary/10"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-muted-foreground">نتيجة النطق:</span>
                            <span className={cn(
                              "text-2xl font-black",
                              result.score >= 80 ? "text-green-500" : result.score >= 50 ? "text-yellow-500" : "text-red-500"
                            )}>
                              {result.score}%
                            </span>
                          </div>
                          <p className="text-sm text-center font-bold text-primary">{result.feedback}</p>
                          <div className="text-xs text-muted-foreground italic">
                            لقد قلت: "{result.transcript}"
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs font-bold gap-2"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      <History className="w-4 h-4" />
                      سجل المحاولات ({attempts?.length || 0})
                    </Button>
                  </div>

                  <AnimatePresence>
                    {showHistory && attempts && attempts.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-6 space-y-2 overflow-hidden"
                      >
                        <div className="text-right text-xs font-bold text-muted-foreground mb-2">آخر المحاولات:</div>
                        {attempts.slice(0, 3).map((attempt: any) => (
                          <div key={attempt.id} className="flex justify-between items-center p-2 rounded-lg bg-background/50 text-xs">
                            <span className="text-muted-foreground">{new Date(attempt.created_at).toLocaleTimeString('ar-EG')}</span>
                            <span className="font-bold">"{attempt.spoken_text}"</span>
                            <span className={cn(
                              "font-black px-2 py-0.5 rounded-full",
                              attempt.score >= 80 ? "bg-green-500/10 text-green-500" : attempt.score >= 50 ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                            )}>
                              {attempt.score}%
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </ThreeDCard>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-6">
            <Button 
              variant="outline" 
              size="lg" 
              className="h-16 px-8 rounded-2xl font-black border-2"
              onClick={prevWord}
              disabled={currentIndex === 0}
            >
              <ChevronRight className="ml-2 h-6 w-6" />
              Previous
            </Button>
            <Button 
              size="lg" 
              className="h-16 px-8 rounded-2xl font-black shadow-xl shadow-primary/20"
              onClick={nextWord}
              disabled={currentIndex === vocab.length - 1}
            >
              Next
              <ChevronLeft className="mr-2 h-6 w-6" />
            </Button>
          </div>

          <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 flex items-start gap-4">
             <div className="bg-primary/20 p-3 rounded-2xl text-primary">
               <BookOpen className="w-6 h-6" />
             </div>
             <div className="space-y-2">
               <h4 className="font-bold text-lg">نصيحة تعليمية</h4>
               <p className="text-muted-foreground">
                 استمع إلى الكلمة أكثر من مرة وحاول تكرارها بصوت عالٍ. الربط بين الكلمة ومعناها بالعربي يساعد في الحفظ السريع.
               </p>
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
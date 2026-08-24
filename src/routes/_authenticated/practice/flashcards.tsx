import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, RotateCcw, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { ThreeDCard } from "@/components/ThreeDEffects";
import { PracticeSkeleton } from "@/components/PracticeSkeleton";

export const Route = createFileRoute("/_authenticated/practice/flashcards")({
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const { speak } = useTextToSpeech();

  const { data: vocab, isLoading } = useQuery({
    queryKey: ["vocabulary", "flashcards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("*")
        .limit(20);
      if (error) throw error;
      return data;
    }
  });

  const nextCard = () => {
    if (vocab && currentIndex < vocab.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      // Reached the end, maybe show completion state or cycle back
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (isLoading) return <PracticeSkeleton />;
  if (!vocab || vocab.length === 0) return null;

  const current = vocab[currentIndex];

  return (
    <div className="min-h-screen bg-background py-12 px-4 font-['Cairo']" dir="rtl">
      <div className="container max-w-2xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-primary">
            <GraduationCap className="h-6 w-6" />
            <span>بطاقات تعليمية</span>
          </div>
          <div className="text-sm font-bold text-muted-foreground">
            {currentIndex + 1} / {vocab.length}
          </div>
        </div>

        <div className="perspective-1000 h-[400px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
            className="w-full h-full relative preserve-3d"
          >
            {/* Front Side */}
            <div className="absolute inset-0 backface-hidden">
              <ThreeDCard className="w-full h-full flex flex-col items-center justify-center p-12 text-center border-primary/20 shadow-2xl">
                <span className="text-primary font-bold text-sm uppercase tracking-widest mb-4">كلمة اليوم</span>
                <h2 className="text-5xl font-black">{current?.word}</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="mt-8 rounded-full h-12 w-12 hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (current?.word) speak(current.word);
                  }}
                >
                  <Volume2 className="h-6 w-6 text-primary" />
                </Button>
                <div className="mt-12 text-muted-foreground text-sm font-bold flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  اضغط للقلب
                </div>
              </ThreeDCard>
            </div>

            {/* Back Side */}
            <div className="absolute inset-0 backface-hidden rotate-y-180">
              <ThreeDCard className="w-full h-full flex flex-col items-center justify-center p-12 text-center border-accent/20 shadow-2xl bg-accent/5">
                <span className="text-accent font-bold text-sm uppercase tracking-widest mb-4">الترجمة</span>
                <h2 className="text-5xl font-black text-accent">{current?.translation}</h2>
                <div className="mt-12 text-muted-foreground text-sm font-bold flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  اضغط للعودة
                </div>
              </ThreeDCard>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <Button 
            variant="outline" 
            size="lg" 
            className="h-16 px-8 rounded-2xl font-black border-2"
            onClick={prevCard}
            disabled={currentIndex === 0}
          >
            <ChevronRight className="ml-2 h-6 w-6" />
            السابق
          </Button>
          <Button 
            size="lg" 
            className="h-16 px-8 rounded-2xl font-black shadow-xl shadow-primary/20 group relative overflow-hidden"
            onClick={nextCard}
            disabled={currentIndex === vocab.length - 1}
          >
            <span className="relative z-10 flex items-center">
              Next
              <ChevronLeft className="mr-2 h-6 w-6" />
            </span>
            <div className="absolute inset-0 bg-primary-foreground/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </Button>
        </div>
      </div>
    </div>
  );
}

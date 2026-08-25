import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lock, ArrowRight, Play, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreeDCard, FloatingAsset } from "@/components/ThreeDEffects";

export const Route = createFileRoute("/_authenticated/practice/")({
  component: PracticeSelection,
});

function PracticeSelection() {
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-background py-20 px-4 relative overflow-hidden" 
        dir="ltr"
      >
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container max-w-5xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20"
          >
            <Sparkles className="w-4 h-4" />
            Interactive Practice Section
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-black">Choose Your Practice Path</h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
            Develop your language skills through pronunciation exercises and word memorization in a smart and fun way.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Floating Icons */}
          <FloatingAsset className="absolute -top-12 -left-12 hidden lg:block" delay={0}>
             <BookOpen className="w-16 h-16 text-primary/20" />
          </FloatingAsset>
          <FloatingAsset className="absolute -bottom-12 -right-12 hidden lg:block" delay={1}>
             <Sparkles className="w-16 h-16 text-accent/20" />
          </FloatingAsset>

          {/* Free Tier */}
          <Link to="/practice/free">
            <ThreeDCard className="h-full p-8 md:p-12 border-border/40 hover:border-primary/50 group">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-500">
                  <Play className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-2">Free Practice</h3>
                  <p className="text-muted-foreground text-lg">
                    Available for everyone! Start memorizing basic words and practice pronouncing them correctly.
                  </p>
                </div>
                <ul className="space-y-3">
                  {['Basic vocabulary', 'Real human pronunciation', 'Translation'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20">
                  Start Now for Free
                  <ArrowRight className="mr-2 h-5 w-5" />
                </Button>
              </div>
            </ThreeDCard>
          </Link>

          {/* Premium Tier */}
          <Link to="/practice/premium">
            <ThreeDCard className="h-full p-8 md:p-12 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 hover:border-primary/50 relative group overflow-hidden">
              <div className="absolute top-4 left-4">
                <Lock className="w-6 h-6 text-primary/40" />
              </div>
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-500">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-2">Premium Practice</h3>
                  <p className="text-muted-foreground text-lg">
                    For subscribers only! Learn full sentences and common expressions with a smart progress tracking system.
                  </p>
                </div>
                <ul className="space-y-3">
                  {['Advanced vocabulary', 'Sentences & expressions', 'Progress tracking', 'Ad-free'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full h-14 text-lg font-black border-primary text-primary hover:bg-primary hover:text-white transition-all">
                  Explore Features
                  <ArrowRight className="mr-2 h-5 w-5" />
                </Button>
              </div>
            </ThreeDCard>
          </Link>

          {/* Flashcards */}
          <Link to="/practice/flashcards">
            <ThreeDCard className="h-full p-8 md:p-12 border-orange-500/20 bg-orange-500/5 hover:border-orange-500/50 group">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-500">
                  <Layers className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-2">Flashcards</h3>
                  <p className="text-muted-foreground text-lg">
                    Test your memory with a smart flashcard system to memorize vocabulary quickly.
                  </p>
                </div>
                <ul className="space-y-3">
                  {['Quick memorization', 'Spaced repetition system', 'Fully interactive'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full h-14 text-lg font-black border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white transition-all">
                  Start Reviewing
                  <ArrowRight className="mr-2 h-5 w-5" />
                </Button>
              </div>
            </ThreeDCard>
          </Link>
        </div>
      </div>
      </motion.div>
    </AnimatePresence>
  );
}

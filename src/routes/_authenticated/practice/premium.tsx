import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, ChevronRight, Wallet, BookOpen, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreeDCard } from "@/components/ThreeDEffects";

export const Route = createFileRoute("/_authenticated/practice/premium")({
  component: PremiumPracticePlaceholder,
});

function PremiumPracticePlaceholder() {
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-background py-20 px-4 font-['Cairo']" 
        dir="rtl"
      >
      <div className="container max-w-4xl mx-auto">
        <Button variant="ghost" className="mb-12 font-bold" onClick={() => window.history.back()}>
          <ChevronRight className="ml-2 h-5 w-5" />
          رجوع
        </Button>

        <ThreeDCard className="p-12 md:p-20 text-center border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -z-10" />
          
          <div className="flex justify-center mb-8">
            <div className="bg-primary/10 p-6 rounded-3xl text-primary animate-bounce-slow">
              <Lock className="w-16 h-16" />
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-black mb-6">محتوى حصري للمشتركين</h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            قسم التدريب الاحترافي يتضمن جمل كاملة، تعبيرات يومية، وقاموس ناطق متخصص لمساعدتك على إتقان اللغة بطلاقة.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 text-right mb-12">
            {[
              { title: "أكثر من 5000 كلمة", icon: BookOpen },
              { title: "جمل وتعبيرات شائعة", icon: Sparkles },
              { title: "تتبع ذكي للتقدم", icon: Wallet },
              { title: "نطق بلهجات مختلفة", icon: Mic },
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 hover:border-primary/30 transition-colors"
              >
                <feature.icon className="w-5 h-5 text-primary" />
                <span className="font-bold">{feature.title}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-16 px-10 text-xl font-black shadow-2xl shadow-primary/30" asChild>
              <Link to="/">اشترك الآن للوصول</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-16 px-10 text-xl font-black border-2" asChild>
              <Link to="/contact">تواصل مع الدعم</Link>
            </Button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Wallet className="w-4 h-4" />
            <span className="text-sm font-bold">طرق دفع سهلة وآمنة (فودافون كاش & انستا باي)</span>
          </div>
        </ThreeDCard>
      </div>
      </motion.div>
    </AnimatePresence>
  );
}

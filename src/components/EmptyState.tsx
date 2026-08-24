import { motion } from "framer-motion";
import { Search, BookOpen, GraduationCap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: "search" | "book" | "graduation";
  actionText?: string;
  onAction?: () => void;
}

const icons = {
  search: Search,
  book: BookOpen,
  graduation: GraduationCap,
};

export function EmptyState({ 
  title, 
  description, 
  icon = "book", 
  actionText, 
  onAction 
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center glass rounded-[3rem] border-2 border-dashed border-primary/20 space-y-6 max-w-2xl mx-auto"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <div className="relative bg-primary/10 p-8 rounded-full text-primary animate-float">
          <Icon className="w-16 h-16" />
        </div>
      </div>
      
      <div className="space-y-2 relative z-10">
        <h3 className="text-3xl font-black text-foreground">{title}</h3>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>

      {actionText && (
        <Button 
          onClick={onAction}
          size="lg"
          className="h-14 px-8 text-lg font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all rounded-2xl"
        >
          {actionText}
        </Button>
      )}
    </motion.div>
  );
}

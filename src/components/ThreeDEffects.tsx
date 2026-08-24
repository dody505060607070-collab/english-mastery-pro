import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ThreeDCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const ThreeDCard = ({ children, className, onClick }: ThreeDCardProps) => {
  return (
    <motion.div
      whileHover={{ 
        scale: 1.05, 
        rotateX: 5, 
        rotateY: 5,
        z: 50
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={cn(
        "glass relative overflow-hidden transition-all duration-300 transform-gpu preserve-3d",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

interface FloatingAssetProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export const FloatingAsset = ({ children, className, delay = 0, duration = 6 }: FloatingAssetProps) => {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: [-20, 20, -20] }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut"
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

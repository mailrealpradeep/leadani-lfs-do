import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PulseGlowProps {
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
  color?: "gold" | "blue" | "green" | "purple" | "red";
}

const glowColors = {
  gold: "shadow-amber-400/50",
  blue: "shadow-blue-400/50",
  green: "shadow-green-400/50",
  purple: "shadow-purple-400/50",
  red: "shadow-red-400/50",
};

const bgColors = {
  gold: "bg-amber-400/10",
  blue: "bg-blue-400/10",
  green: "bg-green-400/10",
  purple: "bg-purple-400/10",
  red: "bg-red-400/10",
};

export function PulseGlow({
  isActive,
  children,
  className,
  color = "gold",
}: PulseGlowProps) {
  return (
    <div className={cn("relative", className)} data-testid="pulse-glow">
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.02, 1],
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              duration: 1,
              repeat: 2,
              ease: "easeInOut",
            }}
            className={cn(
              "absolute inset-0 rounded-lg",
              bgColors[color],
              `shadow-lg ${glowColors[color]}`
            )}
          />
        )}
      </AnimatePresence>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

interface GlowBorderProps {
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
}

export function GlowBorder({ isActive, children, className }: GlowBorderProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl transition-all duration-300",
        isActive && "shadow-lg shadow-amber-400/30",
        className
      )}
      data-testid="glow-border"
    >
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 opacity-75 blur-sm"
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

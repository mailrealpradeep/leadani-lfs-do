import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CelebrationOverlayProps {
  isActive: boolean;
  message: string | null;
  points: number | null;
  onDismiss: () => void;
  type?: "milestone" | "appreciation" | "achievement";
}

export function CelebrationOverlay({
  isActive,
  message,
  points,
  onDismiss,
  type = "achievement",
}: CelebrationOverlayProps) {
  const icons = {
    milestone: Trophy,
    appreciation: Star,
    achievement: Sparkles,
  };

  const Icon = icons[type];

  const gradients = {
    milestone: "from-amber-500 via-yellow-400 to-amber-500",
    appreciation: "from-pink-500 via-purple-500 to-pink-500",
    achievement: "from-blue-500 via-cyan-400 to-blue-500",
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onDismiss}
          data-testid="celebration-overlay"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="relative max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 z-10 bg-background/80 rounded-full"
              onClick={onDismiss}
              data-testid="button-dismiss-celebration"
            >
              <X className="h-4 w-4" />
            </Button>

            <div className={cn(
              "relative p-8 rounded-2xl bg-gradient-to-br text-white shadow-2xl",
              gradients[type]
            )}>
              <Particles />
              
              <div className="relative z-10 text-center space-y-4">
                <motion.div
                  animate={{ 
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <Icon className="h-16 w-16 mx-auto drop-shadow-lg" />
                </motion.div>

                {points !== null && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.3 }}
                    className="text-5xl font-bold drop-shadow-lg"
                    data-testid="text-celebration-points"
                  >
                    +{points.toLocaleString()}
                  </motion.div>
                )}

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl font-medium drop-shadow"
                  data-testid="text-celebration-message"
                >
                  {message}
                </motion.p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 0, 
            x: "50%", 
            y: "50%",
            scale: 0,
          }}
          animate={{ 
            opacity: [0, 1, 0],
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
          }}
          className="absolute w-2 h-2 bg-white/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

interface ScorePopupProps {
  points: number;
  isVisible: boolean;
  className?: string;
}

export function ScorePopup({ points, isVisible, className }: ScorePopupProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -30, scale: 1 }}
          exit={{ opacity: 0, y: -60, scale: 0.8 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "absolute font-bold text-lg",
            points > 0 ? "text-green-500" : "text-red-500",
            className
          )}
          data-testid="score-popup"
        >
          {points > 0 ? "+" : ""}{points}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

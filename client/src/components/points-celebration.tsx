import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Star, Zap } from "lucide-react";
import { playCoinSound, playFanfareSound } from "@/lib/celebration-sounds";
import { getSocket } from "@/lib/socket";

interface PointsCelebration {
  id: string;
  points: number;
  ruleName: string;
  userName?: string;
  isCompanyWide: boolean;
  timestamp: number;
}

interface PointsCelebrationProps {
  celebration: PointsCelebration;
  onComplete: (id: string) => void;
}

function PointsCelebrationItem({ celebration, onComplete }: PointsCelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete(celebration.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [celebration.id, onComplete]);

  const isLargePoints = celebration.points >= 10;
  const isMajorAchievement = celebration.isCompanyWide;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.5 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
      }}
      exit={{ opacity: 0, y: -100, scale: 0.8 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20,
        duration: 0.6 
      }}
      className={`
        relative flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl
        ${isMajorAchievement 
          ? "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" 
          : "bg-gradient-to-r from-emerald-500 to-teal-500"
        }
      `}
      data-testid="points-celebration"
    >
      {/* Sparkle effects */}
      <motion.div
        className="absolute inset-0 overflow-hidden rounded-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {[...Array(isMajorAchievement ? 8 : 4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ 
              opacity: 0,
              x: "50%",
              y: "50%",
              scale: 0
            }}
            animate={{ 
              opacity: [0, 1, 0],
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              scale: [0, 1.5, 0]
            }}
            transition={{ 
              duration: 1.5,
              delay: i * 0.1,
              repeat: 2
            }}
          >
            <Star className="h-3 w-3 text-white/80" fill="currentColor" />
          </motion.div>
        ))}
      </motion.div>

      {/* Glow effect */}
      <motion.div
        className={`
          absolute inset-0 rounded-2xl blur-xl -z-10
          ${isMajorAchievement 
            ? "bg-yellow-400/50" 
            : "bg-emerald-400/40"
          }
        `}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{ 
          duration: 1.5,
          repeat: Infinity
        }}
      />

      {/* Icon */}
      <motion.div
        animate={{ 
          rotate: [0, -10, 10, -10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          duration: 0.5,
          delay: 0.3
        }}
        className="relative"
      >
        {isMajorAchievement ? (
          <Trophy className="h-8 w-8 text-white drop-shadow-lg" />
        ) : isLargePoints ? (
          <Zap className="h-7 w-7 text-white drop-shadow-lg" />
        ) : (
          <Sparkles className="h-6 w-6 text-white drop-shadow-lg" />
        )}
      </motion.div>

      {/* Points and text */}
      <div className="flex flex-col text-white">
        <motion.div 
          className="flex items-center gap-2"
          initial={{ scale: 0.5 }}
          animate={{ scale: [0.5, 1.3, 1] }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <span className={`font-black drop-shadow-lg ${isLargePoints ? "text-3xl" : "text-2xl"}`}>
            +{celebration.points}
          </span>
          <span className="text-lg font-semibold opacity-90">pts</span>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm font-medium text-white/90"
        >
          {celebration.userName && (
            <span className="font-bold">{celebration.userName} • </span>
          )}
          {celebration.ruleName}
        </motion.div>
      </div>

      {/* Pulse ring for major achievements */}
      {isMajorAchievement && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-white/30"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity
          }}
        />
      )}
    </motion.div>
  );
}

// Global celebration manager
let addCelebration: ((celebration: Omit<PointsCelebration, "id" | "timestamp">) => void) | null = null;

export function triggerPointsCelebration(
  points: number, 
  ruleName: string, 
  userName?: string,
  isCompanyWide: boolean = false
) {
  if (addCelebration) {
    addCelebration({ points, ruleName, userName, isCompanyWide });
  }
}

export function PointsCelebrationContainer() {
  const [celebrations, setCelebrations] = useState<PointsCelebration[]>([]);

  const handleAddCelebration = useCallback((celebration: Omit<PointsCelebration, "id" | "timestamp">) => {
    const newCelebration: PointsCelebration = {
      ...celebration,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setCelebrations(prev => [...prev, newCelebration]);
    
    // Play appropriate sound
    if (celebration.isCompanyWide) {
      playFanfareSound();
    } else {
      playCoinSound();
    }
  }, []);

  const handleRemoveCelebration = useCallback((id: string) => {
    setCelebrations(prev => prev.filter(c => c.id !== id));
  }, []);

  useEffect(() => {
    addCelebration = handleAddCelebration;
    return () => {
      addCelebration = null;
    };
  }, [handleAddCelebration]);

  // Listen for socket events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePointsCelebration = (data: {
      userId: string;
      userName: string;
      points: number;
      ruleName: string;
      actionType: string;
      showAnimationTo: string;
      companyId: string;
      timestamp: number;
    }) => {
      // Determine if this is company-wide based on showAnimationTo
      const isCompanyWide = data.showAnimationTo === "all_users" || data.showAnimationTo === "admins_only";
      handleAddCelebration({
        points: data.points,
        ruleName: data.ruleName,
        userName: isCompanyWide ? data.userName : undefined,
        isCompanyWide,
      });
    };

    socket.on("points_celebration", handlePointsCelebration);

    return () => {
      socket.off("points_celebration", handlePointsCelebration);
    };
  }, [handleAddCelebration]);

  return (
    <div 
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none"
      data-testid="points-celebration-container"
    >
      <AnimatePresence mode="popLayout">
        {celebrations.map((celebration) => (
          <PointsCelebrationItem
            key={celebration.id}
            celebration={celebration}
            onComplete={handleRemoveCelebration}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

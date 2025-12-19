import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Gift, Zap, PartyPopper, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface LoginBonusResponse {
  awarded: number;
  pending: number;
  already_claimed: boolean;
}

export function LoginBonusCelebration() {
  const [showCelebration, setShowCelebration] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/powerscore/login-bonus/claim");
      return res.json() as Promise<LoginBonusResponse>;
    },
    onSuccess: (data) => {
      if (data.awarded > 0) {
        setPointsAwarded(data.awarded);
        setShowCelebration(true);
        queryClient.invalidateQueries({ queryKey: ["/api/powerscore/leaderboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/powerscore/my-stats"] });
        
        setTimeout(() => {
          setShowCelebration(false);
        }, 4000);
      }
    },
  });

  useEffect(() => {
    const sessionKey = `powerscore_login_bonus_${new Date().toDateString()}`;
    const alreadyTriggered = sessionStorage.getItem(sessionKey);
    
    if (!alreadyTriggered) {
      sessionStorage.setItem(sessionKey, "true");
      claimMutation.mutate();
    }
  }, []);

  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: Math.random() * -100 - 50,
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.5,
    delay: Math.random() * 0.3,
  }));

  return (
    <AnimatePresence>
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          data-testid="login-bonus-celebration"
        >
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
          >
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute"
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1, 
                  scale: particle.scale,
                  rotate: 0 
                }}
                animate={{ 
                  x: particle.x * 4, 
                  y: particle.y * 2, 
                  opacity: 0,
                  scale: 0,
                  rotate: particle.rotation
                }}
                transition={{ 
                  duration: 1.5, 
                  delay: 0.2 + particle.delay,
                  ease: "easeOut" 
                }}
              >
                {particle.id % 4 === 0 && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
                {particle.id % 4 === 1 && <Sparkles className="h-4 w-4 text-amber-500" />}
                {particle.id % 4 === 2 && <Zap className="h-3 w-3 text-orange-400 fill-orange-400" />}
                {particle.id % 4 === 3 && <div className="h-2 w-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />}
              </motion.div>
            ))}

            <motion.div
              className="relative mb-4"
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 0.8, 
                repeat: 2,
                ease: "easeInOut"
              }}
            >
              <motion.div
                className="absolute inset-0 blur-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 opacity-60 scale-150"
                animate={{ scale: [1.3, 1.7, 1.3], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div className="relative p-6 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-3xl shadow-2xl shadow-orange-500/40">
                <PartyPopper className="h-16 w-16 text-white" />
              </div>
            </motion.div>

            <motion.div
              className="text-center space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.h2 
                className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                Login Bonus!
              </motion.h2>
              
              <motion.div
                className="flex items-center justify-center gap-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-lg">
                  +{pointsAwarded}
                </span>
                <Zap className="h-8 w-8 text-yellow-400 fill-yellow-400" />
              </motion.div>

              <motion.p
                className="text-lg text-white/90 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Points Credited - Congrats!
              </motion.p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

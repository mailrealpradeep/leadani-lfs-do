import { motion } from "framer-motion";
import { Crown, Sparkles, Trophy, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScoreTicker } from "./animated-counter";
import { cn } from "@/lib/utils";
import type { PowerScoreLeaderboardEntry } from "@shared/schema";

interface AnimatedPodiumProps {
  leaderboard: PowerScoreLeaderboardEntry[];
  currentUserId?: string;
}

const podiumConfig = {
  1: {
    podiumHeight: "h-36",
    avatarSize: "h-24 w-24",
    ringWidth: "ring-[5px]",
    ringColor: "ring-amber-400",
    avatarGlow: "shadow-[0_0_40px_rgba(251,191,36,0.6)]",
    bgGradient: "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500",
    bgShimmer: "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:animate-shimmer",
    labelText: "1st",
    delay: 0.1,
    order: 2,
  },
  2: {
    podiumHeight: "h-28",
    avatarSize: "h-[4.5rem] w-[4.5rem]",
    ringWidth: "ring-4",
    ringColor: "ring-slate-300",
    avatarGlow: "shadow-[0_0_25px_rgba(148,163,184,0.5)]",
    bgGradient: "bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400",
    bgShimmer: "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-shimmer",
    labelText: "2nd",
    delay: 0.2,
    order: 1,
  },
  3: {
    podiumHeight: "h-24",
    avatarSize: "h-16 w-16",
    ringWidth: "ring-4",
    ringColor: "ring-orange-400",
    avatarGlow: "shadow-[0_0_25px_rgba(251,146,60,0.5)]",
    bgGradient: "bg-gradient-to-b from-orange-300 via-orange-400 to-orange-500",
    bgShimmer: "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-shimmer",
    labelText: "3rd",
    delay: 0.3,
    order: 3,
  },
};

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${5 + (i * 8)}%`,
            top: `${20 + (i % 4) * 15}%`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, i % 2 === 0 ? 5 : -5, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            repeat: Infinity,
            duration: 3 + (i % 3),
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        >
          {i % 3 === 0 ? (
            <Star className="h-2.5 w-2.5 text-amber-400/60 fill-amber-400/40" />
          ) : i % 3 === 1 ? (
            <Sparkles className="h-2 w-2 text-amber-300/50" />
          ) : (
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400/40" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function PodiumSpot({ 
  entry, 
  rank, 
  isCurrentUser 
}: { 
  entry: PowerScoreLeaderboardEntry; 
  rank: 1 | 2 | 3; 
  isCurrentUser: boolean;
}) {
  const config = podiumConfig[rank];
  const initials = entry.user_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: config.delay, 
        type: "spring", 
        damping: 15,
        stiffness: 100,
      }}
      className={cn(
        "flex flex-col items-center",
        rank === 1 ? "z-30" : rank === 2 ? "z-20" : "z-10"
      )}
      style={{ order: config.order }}
      data-testid={`podium-spot-${rank}`}
    >
      <motion.div 
        className="relative mb-3"
        whileHover={{ scale: 1.08, y: -5 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {rank === 1 && (
          <motion.div
            className="absolute -top-8 left-1/2 -translate-x-1/2"
            animate={{ 
              y: [0, -6, 0],
              rotate: [0, -5, 5, 0],
            }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          >
            <div className="relative">
              <Crown className="h-10 w-10 text-amber-500 drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)]" />
              <motion.div
                className="absolute inset-0"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Crown className="h-10 w-10 text-amber-300 blur-sm" />
              </motion.div>
            </div>
          </motion.div>
        )}
        
        <motion.div
          animate={rank === 1 ? {
            boxShadow: [
              "0 0 30px 8px rgba(251, 191, 36, 0.4)",
              "0 0 50px 15px rgba(251, 191, 36, 0.6)",
              "0 0 30px 8px rgba(251, 191, 36, 0.4)",
            ],
          } : undefined}
          transition={{ repeat: Infinity, duration: 2 }}
          className={cn(
            "relative rounded-full",
            rank === 1 && "p-1 bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400"
          )}
        >
          <Avatar 
            className={cn(
              config.avatarSize, 
              config.ringWidth, 
              config.ringColor, 
              config.avatarGlow,
              isCurrentUser && "ring-blue-500",
              "transition-shadow duration-300"
            )}
          >
            <AvatarImage src={entry.avatar_url} alt={entry.user_name} />
            <AvatarFallback className={cn(
              "font-bold text-white",
              rank === 1 
                ? "bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-xl" 
                : rank === 2 
                  ? "bg-gradient-to-br from-slate-400 to-slate-600 text-lg"
                  : "bg-gradient-to-br from-orange-400 to-orange-600 text-base"
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {isCurrentUser && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg border-2 border-white"
            >
              You
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      <motion.div 
        className="text-center mb-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: config.delay + 0.15 }}
      >
        <h4 
          className={cn(
            "font-bold truncate max-w-[110px]",
            rank === 1 ? "text-base" : "text-sm"
          )} 
          data-testid={`text-podium-name-${rank}`}
        >
          {entry.user_name}
        </h4>
      </motion.div>

      <motion.div 
        className={cn(
          "relative overflow-hidden rounded-t-2xl w-full min-w-[100px]",
          rank === 1 && "min-w-[130px]",
          config.podiumHeight,
          config.bgGradient,
          "shadow-[0_-4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)]",
        )}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        transition={{ delay: config.delay + 0.05, duration: 0.6, ease: "easeOut" }}
      >
        <div className={cn(
          "absolute inset-0 opacity-60",
          "bg-gradient-to-r from-transparent via-white/20 to-transparent",
          "animate-[shimmer_3s_ease-in-out_infinite]"
        )} />
        
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/40 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/40 to-transparent" />
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full pt-3 pb-8">
          <motion.div 
            className={cn(
              "rounded-full p-2.5 mb-2",
              rank === 1 
                ? "bg-white/95 shadow-lg" 
                : "bg-white/90 shadow-md"
            )}
            whileHover={{ scale: 1.15, rotate: 10 }}
          >
            <Trophy className={cn(
              rank === 1 ? "h-5 w-5 text-amber-500" :
              rank === 2 ? "h-4 w-4 text-slate-500" :
              "h-4 w-4 text-orange-500"
            )} />
          </motion.div>
          
          <div className="text-center">
            <ScoreTicker 
              value={entry.score} 
              size={rank === 1 ? "xl" : "lg"} 
              className={cn(
                "font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]",
                rank === 1 && "text-3xl"
              )} 
            />
          </div>
        </div>

        <motion.div 
          className={cn(
            "absolute bottom-0 left-0 right-0 py-1.5 text-center font-bold text-sm text-white/95",
            "bg-black/20 backdrop-blur-[2px]",
            "border-t border-white/10"
          )}
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: config.delay + 0.25 }}
        >
          {config.labelText}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function AnimatedPodium({ leaderboard, currentUserId }: AnimatedPodiumProps) {
  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];

  if (!first) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative py-8 px-6"
      data-testid="animated-podium"
    >
      <div className="absolute inset-0 bg-gradient-radial from-amber-100/80 via-amber-50/40 to-transparent dark:from-amber-900/30 dark:via-amber-950/15 dark:to-transparent rounded-3xl" />
      
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
      
      <FloatingParticles />
      
      <div className="relative flex items-end justify-center gap-3 sm:gap-6 md:gap-8">
        {second && (
          <PodiumSpot 
            entry={second} 
            rank={2} 
            isCurrentUser={second.user_id === currentUserId}
          />
        )}
        
        <PodiumSpot 
          entry={first} 
          rank={1} 
          isCurrentUser={first.user_id === currentUserId}
        />
        
        {third && (
          <PodiumSpot 
            entry={third} 
            rank={3} 
            isCurrentUser={third.user_id === currentUserId}
          />
        )}
      </div>
    </motion.div>
  );
}

import { motion } from "framer-motion";
import { Crown, Medal, Award, Sparkles } from "lucide-react";
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
    height: "h-32",
    avatarSize: "h-20 w-20",
    ringColor: "ring-amber-400",
    ringGlow: "shadow-amber-400/50",
    bgGradient: "from-amber-400 via-yellow-400 to-amber-500",
    labelBg: "bg-gradient-to-r from-amber-500 to-yellow-500",
    icon: Crown,
    iconColor: "text-amber-500",
    delay: 0.2,
    zIndex: "z-30",
  },
  2: {
    height: "h-24",
    avatarSize: "h-16 w-16",
    ringColor: "ring-gray-400",
    ringGlow: "shadow-gray-400/40",
    bgGradient: "from-gray-300 via-gray-200 to-gray-400",
    labelBg: "bg-gradient-to-r from-gray-400 to-gray-500",
    icon: Medal,
    iconColor: "text-gray-500",
    delay: 0.3,
    zIndex: "z-20",
  },
  3: {
    height: "h-20",
    avatarSize: "h-14 w-14",
    ringColor: "ring-orange-400",
    ringGlow: "shadow-orange-400/40",
    bgGradient: "from-orange-400 via-orange-300 to-amber-400",
    labelBg: "bg-gradient-to-r from-orange-500 to-amber-500",
    icon: Award,
    iconColor: "text-orange-500",
    delay: 0.4,
    zIndex: "z-10",
  },
};

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
  const Icon = config.icon;
  const initials = entry.user_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: config.delay, type: "spring", damping: 12 }}
      className={cn("flex flex-col items-center", config.zIndex)}
      data-testid={`podium-spot-${rank}`}
    >
      <motion.div 
        className="relative mb-2"
        whileHover={{ scale: 1.05 }}
      >
        {rank === 1 && (
          <motion.div
            className="absolute -top-4 left-1/2 -translate-x-1/2"
            animate={{ 
              y: [0, -4, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Crown className="h-6 w-6 text-amber-500 drop-shadow-lg" />
          </motion.div>
        )}
        
        <motion.div
          animate={rank === 1 ? {
            boxShadow: [
              "0 0 20px 5px rgba(251, 191, 36, 0.3)",
              "0 0 30px 10px rgba(251, 191, 36, 0.5)",
              "0 0 20px 5px rgba(251, 191, 36, 0.3)",
            ],
          } : undefined}
          transition={{ repeat: Infinity, duration: 2 }}
          className="relative"
        >
          <Avatar 
            className={cn(
              config.avatarSize, 
              "ring-4", 
              config.ringColor, 
              "shadow-lg",
              config.ringGlow,
              isCurrentUser && "ring-blue-500"
            )}
          >
            <AvatarImage src={entry.avatar_url} alt={entry.user_name} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {isCurrentUser && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-lg"
            >
              You
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      <motion.div 
        className="text-center mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: config.delay + 0.2 }}
      >
        <h4 className="font-semibold text-sm truncate max-w-[100px]" data-testid={`text-podium-name-${rank}`}>
          {entry.user_name}
        </h4>
        <p className="text-xs text-muted-foreground truncate max-w-[100px]">
          {entry.user_email?.split('@')[0]}
        </p>
      </motion.div>

      <motion.div 
        className={cn(
          "relative overflow-hidden rounded-t-xl px-4 pt-3 pb-2",
          config.height,
          "bg-gradient-to-b",
          config.bgGradient,
          "shadow-lg"
        )}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        transition={{ delay: config.delay + 0.1, duration: 0.5 }}
      >
        {rank === 1 && (
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${10 + (i % 3) * 20}%`,
                }}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5 + i * 0.2,
                  delay: i * 0.3,
                }}
              >
                <Sparkles className="h-3 w-3 text-white/50" />
              </motion.div>
            ))}
          </motion.div>
        )}
        
        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            className="bg-white/90 rounded-full p-2 mb-2"
            whileHover={{ scale: 1.1, rotate: 10 }}
          >
            <Icon className={cn("h-4 w-4", config.iconColor)} />
          </motion.div>
          
          <div className="text-center text-white">
            <ScoreTicker value={entry.score} size="lg" className="text-white font-bold drop-shadow" />
          </div>
        </div>

        <motion.div 
          className={cn(
            "absolute bottom-0 left-0 right-0 py-1 text-center",
            config.labelBg,
            "text-white font-bold text-sm shadow-inner"
          )}
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: config.delay + 0.3 }}
        >
          {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}
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
      className="relative py-6 px-4"
      data-testid="animated-podium"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-950/20 rounded-2xl" />
      
      <div className="relative flex items-end justify-center gap-4 sm:gap-8">
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

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  Trophy, Star, Flame, Zap, Target, Crown, Medal, Award, 
  TrendingUp, Rocket, Diamond, Heart
} from "lucide-react";
import { POWERSCORE_BADGE_COLORS } from "@/lib/powerscore-constants";

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  flame: Flame,
  zap: Zap,
  target: Target,
  crown: Crown,
  medal: Medal,
  award: Award,
  "trending-up": TrendingUp,
  rocket: Rocket,
  diamond: Diamond,
  heart: Heart,
};

interface BadgeIconProps {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 p-1",
  md: "h-8 w-8 p-1.5",
  lg: "h-12 w-12 p-2",
};

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

export function BadgeIcon({ icon, color, size = "md", animate = false, className }: BadgeIconProps) {
  const Icon = iconMap[icon] || Star;
  const colorConfig = POWERSCORE_BADGE_COLORS.find((c) => c.id === color) || POWERSCORE_BADGE_COLORS[0];

  const content = (
    <div
      className={cn(
        "rounded-full flex items-center justify-center bg-gradient-to-br shadow-md",
        colorConfig.gradient,
        sizeClasses[size],
        className
      )}
      data-testid={`badge-icon-${icon}`}
    >
      <Icon className={cn(iconSizes[size], colorConfig.text)} />
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 10, stiffness: 200 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

interface RankBadgeProps {
  rank: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RankBadge({ rank, size = "md", className }: RankBadgeProps) {
  const rankConfig = {
    1: { 
      gradient: "from-yellow-300 via-amber-400 to-yellow-500", 
      text: "text-amber-900",
      icon: Crown,
      label: "1st",
    },
    2: { 
      gradient: "from-gray-200 via-gray-300 to-gray-400", 
      text: "text-gray-800",
      icon: Medal,
      label: "2nd",
    },
    3: { 
      gradient: "from-orange-300 via-orange-400 to-orange-500", 
      text: "text-orange-900",
      icon: Medal,
      label: "3rd",
    },
  };

  const config = rankConfig[rank as keyof typeof rankConfig];

  if (!config) {
    return (
      <div 
        className={cn(
          "rounded-full flex items-center justify-center bg-muted font-bold",
          sizeClasses[size],
          className
        )}
        data-testid={`rank-badge-${rank}`}
      >
        <span className="text-muted-foreground text-xs">#{rank}</span>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      className={cn(
        "rounded-full flex items-center justify-center bg-gradient-to-br shadow-lg",
        config.gradient,
        sizeClasses[size],
        className
      )}
      data-testid={`rank-badge-${rank}`}
    >
      <Icon className={cn(iconSizes[size], config.text)} />
    </motion.div>
  );
}

interface BadgeStackProps {
  badges: Array<{ icon: string; color: string; name: string }>;
  maxVisible?: number;
  size?: "sm" | "md";
}

export function BadgeStack({ badges, maxVisible = 3, size = "sm" }: BadgeStackProps) {
  const visibleBadges = badges.slice(0, maxVisible);
  const remaining = badges.length - maxVisible;

  return (
    <div className="flex -space-x-2" data-testid="badge-stack">
      {visibleBadges.map((badge, index) => (
        <div key={index} className="relative" style={{ zIndex: maxVisible - index }}>
          <BadgeIcon icon={badge.icon} color={badge.color} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "rounded-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-medium",
            size === "sm" ? "h-6 w-6" : "h-8 w-8"
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

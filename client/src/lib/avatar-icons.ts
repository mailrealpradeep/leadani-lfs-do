import {
  Star,
  Sparkles,
  Zap,
  Flame,
  Heart,
  Diamond,
  Crown,
  Gem,
  Sun,
  Moon,
  Cloud,
  Snowflake,
  Flower2,
  Leaf,
  TreeDeciduous,
  Mountain,
  Waves,
  Wind,
  Rocket,
  Plane,
  Anchor,
  Compass,
  Target,
  Award,
  Trophy,
  Medal,
  Music,
  Palette,
  Camera,
  Gamepad2,
  Puzzle,
  Lightbulb,
  Atom,
  Globe,
  Orbit,
  Bird,
  Fish,
  Bug,
  Cat,
  Dog,
  Rabbit,
  type LucideIcon,
} from "lucide-react";

interface AvatarStyle {
  icon: LucideIcon;
  gradient: string;
  iconColor: string;
  bgColor: string;
}

const avatarStyles: AvatarStyle[] = [
  { icon: Star, gradient: "from-yellow-400 to-amber-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30" },
  { icon: Sparkles, gradient: "from-purple-400 to-pink-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30" },
  { icon: Zap, gradient: "from-blue-400 to-cyan-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30" },
  { icon: Flame, gradient: "from-orange-400 to-red-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30" },
  { icon: Heart, gradient: "from-rose-400 to-pink-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30" },
  { icon: Diamond, gradient: "from-cyan-400 to-blue-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30" },
  { icon: Crown, gradient: "from-amber-400 to-yellow-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30" },
  { icon: Gem, gradient: "from-emerald-400 to-teal-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30" },
  { icon: Sun, gradient: "from-yellow-400 to-orange-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30" },
  { icon: Moon, gradient: "from-indigo-400 to-purple-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30" },
  { icon: Cloud, gradient: "from-sky-400 to-blue-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30" },
  { icon: Snowflake, gradient: "from-blue-300 to-cyan-400", iconColor: "text-white", bgColor: "bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30" },
  { icon: Flower2, gradient: "from-pink-400 to-rose-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30" },
  { icon: Leaf, gradient: "from-green-400 to-emerald-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30" },
  { icon: TreeDeciduous, gradient: "from-lime-400 to-green-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-lime-100 to-green-100 dark:from-lime-900/30 dark:to-green-900/30" },
  { icon: Mountain, gradient: "from-slate-400 to-gray-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-900/30 dark:to-gray-900/30" },
  { icon: Waves, gradient: "from-blue-400 to-indigo-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30" },
  { icon: Wind, gradient: "from-teal-400 to-cyan-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30" },
  { icon: Rocket, gradient: "from-violet-400 to-purple-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30" },
  { icon: Plane, gradient: "from-sky-400 to-indigo-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/30 dark:to-indigo-900/30" },
  { icon: Anchor, gradient: "from-blue-500 to-slate-600", iconColor: "text-white", bgColor: "bg-gradient-to-br from-blue-100 to-slate-100 dark:from-blue-900/30 dark:to-slate-900/30" },
  { icon: Compass, gradient: "from-amber-500 to-orange-600", iconColor: "text-white", bgColor: "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30" },
  { icon: Target, gradient: "from-red-400 to-rose-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30" },
  { icon: Award, gradient: "from-yellow-500 to-amber-600", iconColor: "text-white", bgColor: "bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30" },
  { icon: Trophy, gradient: "from-amber-400 to-yellow-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30" },
  { icon: Medal, gradient: "from-orange-400 to-amber-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30" },
  { icon: Music, gradient: "from-fuchsia-400 to-pink-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-fuchsia-100 to-pink-100 dark:from-fuchsia-900/30 dark:to-pink-900/30" },
  { icon: Palette, gradient: "from-rose-400 to-orange-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-rose-100 to-orange-100 dark:from-rose-900/30 dark:to-orange-900/30" },
  { icon: Camera, gradient: "from-gray-400 to-slate-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-900/30 dark:to-slate-900/30" },
  { icon: Gamepad2, gradient: "from-indigo-400 to-violet-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30" },
  { icon: Puzzle, gradient: "from-emerald-400 to-green-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30" },
  { icon: Lightbulb, gradient: "from-yellow-400 to-lime-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-yellow-100 to-lime-100 dark:from-yellow-900/30 dark:to-lime-900/30" },
  { icon: Atom, gradient: "from-cyan-400 to-teal-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-900/30 dark:to-teal-900/30" },
  { icon: Globe, gradient: "from-blue-400 to-green-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30" },
  { icon: Orbit, gradient: "from-purple-400 to-indigo-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30" },
  { icon: Bird, gradient: "from-sky-400 to-cyan-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-sky-900/30 dark:to-cyan-900/30" },
  { icon: Fish, gradient: "from-blue-400 to-teal-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-blue-100 to-teal-100 dark:from-blue-900/30 dark:to-teal-900/30" },
  { icon: Bug, gradient: "from-lime-400 to-emerald-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-lime-100 to-emerald-100 dark:from-lime-900/30 dark:to-emerald-900/30" },
  { icon: Cat, gradient: "from-orange-400 to-amber-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30" },
  { icon: Dog, gradient: "from-amber-400 to-orange-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30" },
  { icon: Rabbit, gradient: "from-pink-400 to-rose-500", iconColor: "text-white", bgColor: "bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getAvatarStyle(userId: string): AvatarStyle {
  const index = hashString(userId) % avatarStyles.length;
  return avatarStyles[index];
}

export function getUserAvatarProps(userId: string) {
  const style = getAvatarStyle(userId);
  return {
    Icon: style.icon,
    gradient: style.gradient,
    iconColor: style.iconColor,
    bgColor: style.bgColor,
  };
}

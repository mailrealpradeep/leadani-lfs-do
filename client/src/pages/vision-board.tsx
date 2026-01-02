import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, 
  Sparkles, 
  TrendingUp,
  Calendar,
  DollarSign,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Star,
  Zap,
  Users,
  MessageSquare,
  MapPin,
  RefreshCw,
  X,
  Image as ImageIcon,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { VisionBoard, VisionBoardEarning } from "@shared/schema";

interface VisionBoardProgress {
  board: VisionBoard;
  earnings: {
    total: number;
    progress_percent: number;
    goal: number;
    remaining: number;
    projected_incentive?: number;
    actual_incentive?: number;
    projected_progress_percent?: number;
  };
  timeline: {
    total_days: number;
    days_elapsed: number;
    days_remaining: number;
    time_progress_percent: number;
  };
  effort_targets: {
    yearly: { sales: number; visits: number; leads_attended: number; followups: number };
    monthly: { sales: number; visits: number; leads_attended: number; followups: number };
    weekly: { sales: number; visits: number; leads_attended: number; followups: number };
    daily: { sales: number; visits: number; leads_attended: number; followups: number };
  };
}

// New API response format for vision board
interface VisionBoardApiResponse {
  mode: 'personal' | 'team';
  board?: VisionBoard | null;
  board_count?: number;
  aggregate?: {
    id: string;
    company_id: string;
    goal_amount: number;
    total_goal: number;
    total_earnings: number;
    currency: string;
    goal_description: string;
    target_date: string;
    start_date: string;
    images: string[];
    effort_targets: { sales: number; visits: number; leads_attended: number; followups: number };
    is_active: boolean;
  };
  progress?: {
    earnings: {
      total: number;
      progress_percent: number;
      goal: number;
      remaining: number;
      projected_incentive?: number;
      actual_incentive?: number;
      projected_progress_percent?: number;
    };
    team_totals?: {
      total_earnings: number;
      total_goal: number;
      overall_progress_percent: number;
    };
  };
}

const currencySymbols: Record<string, string> = {
  'INR': '₹',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'AED': 'د.إ',
};

const motivationalMessages = [
  "Every sale brings you closer to your dream!",
  "Your hard work is building your future",
  "One step at a time leads to great destinations",
  "Today's efforts create tomorrow's success",
  "You're making incredible progress!",
  "Keep pushing, your dream is within reach",
  "Every follow-up counts towards your goal",
  "Champions are made through daily discipline",
];

function formatCurrency(amount: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency;
  if (amount >= 10000000) return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}

function CircularProgress({ 
  progress, 
  size = 200, 
  strokeWidth = 12,
  children 
}: { 
  progress: number; 
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// Helper function to get motivational message based on progress
function getMotivationalMessage(actualProgress: number, projectedProgress: number): string {
  const ratio = projectedProgress > 0 ? (actualProgress / projectedProgress) * 100 : 0;
  
  if (actualProgress >= 100) return "Goal Achieved!";
  if (ratio >= 80) return "Almost there!";
  if (ratio >= 50) return "Halfway to target!";
  if (ratio >= 25) return "Building momentum!";
  if (actualProgress > 0) return "Great start!";
  return "Let's go!";
}

function DualRingProgress({ 
  actualProgress, 
  projectedProgress,
  size = 200, 
  outerStrokeWidth = 10,
  innerStrokeWidth = 10,
  children 
}: { 
  actualProgress: number; 
  projectedProgress: number;
  size?: number;
  outerStrokeWidth?: number;
  innerStrokeWidth?: number;
  children?: React.ReactNode;
}) {
  const gap = 6;
  const outerRadius = (size - outerStrokeWidth) / 2;
  const innerRadius = outerRadius - outerStrokeWidth / 2 - gap - innerStrokeWidth / 2;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  
  // Guard against undefined/NaN values FIRST
  const safeProjectedProgress = Number.isFinite(projectedProgress) ? projectedProgress : 0;
  const safeActualProgress = Number.isFinite(actualProgress) ? actualProgress : 0;
  
  // Use safe values for offset calculations
  const outerOffset = outerCircumference - (Math.min(safeProjectedProgress, 100) / 100) * outerCircumference;
  const innerOffset = innerCircumference - (Math.min(safeActualProgress, 100) / 100) * innerCircumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }} data-testid="dual-ring-container">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Outer ring background - clean light track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={outerStrokeWidth}
          className="text-amber-100 dark:text-amber-950/40"
        />
        {/* Outer ring - Clean amber/orange for PROJECTED */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={outerStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={outerCircumference}
          initial={{ strokeDashoffset: outerCircumference }}
          animate={{ strokeDashoffset: outerOffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        {/* Inner ring background - clean light track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={innerStrokeWidth}
          className="text-emerald-100 dark:text-emerald-950/40"
        />
        {/* Inner ring - Clean emerald for ACTUAL */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          fill="none"
          stroke="#10B981"
          strokeWidth={innerStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={innerCircumference}
          initial={{ strokeDashoffset: innerCircumference }}
          animate={{ strokeDashoffset: innerOffset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function EffortMetricCard({ 
  icon: Icon, 
  label, 
  target, 
  achieved = 0,
  gradient,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  target: number;
  achieved?: number;
  gradient: string;
  delay?: number;
}) {
  const progress = target > 0 ? Math.min(100, (achieved / target) * 100) : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative overflow-hidden"
    >
      <div className={cn(
        "relative rounded-2xl p-4 backdrop-blur-xl border",
        "bg-white/80 dark:bg-slate-800/80",
        "border-white/20 dark:border-slate-700/50",
        "shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50"
      )}>
        <div className={cn(
          "absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-30",
          `bg-gradient-to-br ${gradient}`
        )} />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-xl bg-gradient-to-br", gradient)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              progress >= 100 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            )}>
              {Math.round(progress)}%
            </span>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{achieved}</span>
            <span className="text-sm text-muted-foreground">/ {target}</span>
          </div>
          
          <div className="mt-3 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: delay + 0.3, ease: "easeOut" }}
              className={cn("h-full rounded-full bg-gradient-to-r", gradient)}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ImageCarousel({ images }: { images: { url: string; caption?: string }[] }) {
  const [current, setCurrent] = useState(0);
  
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${images[current].url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        </motion.div>
      </AnimatePresence>
      
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrent(prev => (prev - 1 + images.length) % images.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
            data-testid="button-carousel-prev"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={() => setCurrent(prev => (prev + 1) % images.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
            data-testid="button-carousel-next"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === current ? "bg-white w-6" : "bg-white/50 hover:bg-white/80"
                )}
                data-testid={`button-carousel-dot-${idx}`}
              />
            ))}
          </div>
        </>
      )}
      
      {images[current].caption && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-12 left-0 right-0 text-center text-white text-lg font-medium px-4"
        >
          {images[current].caption}
        </motion.p>
      )}
    </div>
  );
}

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    goal_amount: "",
    currency: "INR",
    goal_description: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    target_date: "",
    images: [] as { url: string; caption?: string }[],
    effort_targets: {
      sales: 0,
      visits: 0,
      leads_attended: 0,
      followups: 0,
    },
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/vision-board", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] });
      toast({ title: "Vision Board Created!", description: "Your journey to success begins now!" });
      onComplete();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addImage = () => {
    if (imageUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, { url: imageUrl.trim(), caption: imageCaption.trim() || undefined }],
      }));
      setImageUrl("");
      setImageCaption("");
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!formData.goal_amount || Number(formData.goal_amount) <= 0) {
      toast({ title: "Error", description: "Please enter a valid goal amount", variant: "destructive" });
      return;
    }
    if (!formData.start_date || !formData.target_date) {
      toast({ title: "Error", description: "Please select start and end dates", variant: "destructive" });
      return;
    }
    if (new Date(formData.start_date) >= new Date(formData.target_date)) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    
    createMutation.mutate({
      ...formData,
      goal_amount: Number(formData.goal_amount),
      start_date: new Date(formData.start_date).toISOString(),
      target_date: new Date(formData.target_date).toISOString(),
    });
  };

  const yearlyToMonthly = (yearly: number) => Math.ceil(yearly / 12);
  const yearlyToWeekly = (yearly: number) => Math.ceil(yearly / 52);
  const yearlyToDaily = (yearly: number) => Math.ceil(yearly / 365);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-0 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Star className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Create Your Vision Board</CardTitle>
            <CardDescription>
              Step {step} of 4 - {step === 1 ? "Set Your Goal" : step === 2 ? "Add Dream Images" : step === 3 ? "Set Effort Targets" : "Review & Create"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="goal_amount">Goal Amount</Label>
                      <Input
                        id="goal_amount"
                        type="number"
                        placeholder="e.g., 1000000"
                        value={formData.goal_amount}
                        onChange={e => setFormData(prev => ({ ...prev, goal_amount: e.target.value }))}
                        data-testid="input-goal-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={value => setFormData(prev => ({ ...prev, currency: value }))}
                      >
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">₹ INR</SelectItem>
                          <SelectItem value="USD">$ USD</SelectItem>
                          <SelectItem value="EUR">€ EUR</SelectItem>
                          <SelectItem value="GBP">£ GBP</SelectItem>
                          <SelectItem value="AED">د.إ AED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_date">End Date</Label>
                      <Input
                        id="target_date"
                        type="date"
                        value={formData.target_date}
                        onChange={e => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                        data-testid="input-target-date"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="goal_description">What will you achieve with this goal?</Label>
                    <Textarea
                      id="goal_description"
                      placeholder="Describe your dream - buying a house, car, vacation, etc."
                      value={formData.goal_description}
                      onChange={e => setFormData(prev => ({ ...prev, goal_description: e.target.value }))}
                      rows={3}
                      data-testid="input-goal-description"
                    />
                  </div>
                </motion.div>
              )}
              
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="image_url">Image URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="image_url"
                            placeholder="Paste image URL..."
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                            data-testid="input-image-url"
                          />
                          <Button onClick={addImage} size="icon" data-testid="button-add-image">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image_caption">Caption (optional)</Label>
                        <Input
                          id="image_caption"
                          placeholder="e.g., My dream home"
                          value={imageCaption}
                          onChange={e => setImageCaption(e.target.value)}
                          data-testid="input-image-caption"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden aspect-video">
                          <img src={img.url} alt={img.caption || `Dream ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => removeImage(idx)}
                              data-testid={`button-remove-image-${idx}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {img.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                              {img.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {formData.images.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Add images of your dreams to stay motivated</p>
                    </div>
                  )}
                </motion.div>
              )}
              
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <p className="text-sm text-muted-foreground text-center">
                    Set your yearly effort targets. Monthly, weekly, and daily targets will be auto-calculated.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Yearly Sales
                      </Label>
                      <Input
                        type="number"
                        value={formData.effort_targets.sales || ""}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          effort_targets: { ...prev.effort_targets, sales: Number(e.target.value) }
                        }))}
                        placeholder="e.g., 120"
                        data-testid="input-yearly-sales"
                      />
                      <p className="text-xs text-muted-foreground">
                        = {yearlyToMonthly(formData.effort_targets.sales)}/mo, {yearlyToWeekly(formData.effort_targets.sales)}/wk, {yearlyToDaily(formData.effort_targets.sales)}/day
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        Yearly Visits
                      </Label>
                      <Input
                        type="number"
                        value={formData.effort_targets.visits || ""}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          effort_targets: { ...prev.effort_targets, visits: Number(e.target.value) }
                        }))}
                        placeholder="e.g., 365"
                        data-testid="input-yearly-visits"
                      />
                      <p className="text-xs text-muted-foreground">
                        = {yearlyToMonthly(formData.effort_targets.visits)}/mo, {yearlyToWeekly(formData.effort_targets.visits)}/wk, {yearlyToDaily(formData.effort_targets.visits)}/day
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        Yearly New Leads
                      </Label>
                      <Input
                        type="number"
                        value={formData.effort_targets.leads_attended || ""}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          effort_targets: { ...prev.effort_targets, leads_attended: Number(e.target.value) }
                        }))}
                        placeholder="e.g., 500"
                        data-testid="input-yearly-leads"
                      />
                      <p className="text-xs text-muted-foreground">
                        = {yearlyToMonthly(formData.effort_targets.leads_attended)}/mo, {yearlyToWeekly(formData.effort_targets.leads_attended)}/wk, {yearlyToDaily(formData.effort_targets.leads_attended)}/day
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-orange-500" />
                        Yearly Follow-ups
                      </Label>
                      <Input
                        type="number"
                        value={formData.effort_targets.followups || ""}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          effort_targets: { ...prev.effort_targets, followups: Number(e.target.value) }
                        }))}
                        placeholder="e.g., 2000"
                        data-testid="input-yearly-followups"
                      />
                      <p className="text-xs text-muted-foreground">
                        = {yearlyToMonthly(formData.effort_targets.followups)}/mo, {yearlyToWeekly(formData.effort_targets.followups)}/wk, {yearlyToDaily(formData.effort_targets.followups)}/day
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 space-y-4">
                    <div className="text-center">
                      <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {formatCurrency(Number(formData.goal_amount), formData.currency)}
                      </h3>
                      <p className="text-muted-foreground mt-1">{formData.goal_description || "Your Goal"}</p>
                      {formData.target_date && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Target: {format(new Date(formData.target_date), "MMMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    
                    {formData.images.length > 0 && (
                      <div className="flex justify-center gap-2 flex-wrap">
                        {formData.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img.url}
                            alt={img.caption || `Dream ${idx + 1}`}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div>
                        <div className="font-bold text-green-600">{formData.effort_targets.sales}</div>
                        <div className="text-muted-foreground text-xs">Sales/yr</div>
                      </div>
                      <div>
                        <div className="font-bold text-blue-600">{formData.effort_targets.visits}</div>
                        <div className="text-muted-foreground text-xs">Visits/yr</div>
                      </div>
                      <div>
                        <div className="font-bold text-purple-600">{formData.effort_targets.leads_attended}</div>
                        <div className="text-muted-foreground text-xs">Leads/yr</div>
                      </div>
                      <div>
                        <div className="font-bold text-orange-600">{formData.effort_targets.followups}</div>
                        <div className="text-muted-foreground text-xs">Follow-ups/yr</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setStep(prev => prev - 1)}
                disabled={step === 1}
                data-testid="button-wizard-back"
              >
                Back
              </Button>
              {step < 4 ? (
                <Button
                  onClick={() => setStep(prev => prev + 1)}
                  disabled={step === 1 && (!formData.goal_amount || !formData.target_date || !formData.start_date || new Date(formData.start_date) >= new Date(formData.target_date))}
                  data-testid="button-wizard-next"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  data-testid="button-wizard-create"
                >
                  {createMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create Vision Board
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

interface ClosedSale {
  id: string;
  name: string;
  mobile_no: string;
  status: string;
  converted_at: string;
  has_earning: boolean;
}

function UpdateIncentivesDialog({ 
  visionBoardId, 
  onSuccess,
  triggerVariant = "full"
}: { 
  visionBoardId: string; 
  onSuccess: () => void;
  triggerVariant?: "full" | "ghost";
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"sales" | "additional">("sales");
  const [selectedLead, setSelectedLead] = useState<ClosedSale | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const { data: closedSales, isLoading: loadingSales, refetch: refetchSales } = useQuery<ClosedSale[]>({
    queryKey: ["/api/vision-board/closed-sales"],
    queryFn: async () => {
      const response = await fetch("/api/vision-board/closed-sales", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch closed sales");
      return response.json();
    },
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/vision-board/${visionBoardId}/earnings`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board", visionBoardId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board", visionBoardId, "earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board/closed-sales"] });
      toast({ title: "Incentive Added!", description: "Your earnings have been updated!" });
      setAmount("");
      setDescription("");
      setSelectedLead(null);
      refetchSales();
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddSaleValue = (lead: ClosedSale) => {
    if (!amount) {
      toast({ title: "Error", description: "Please enter an amount", variant: "destructive" });
      return;
    }
    addMutation.mutate({
      amount: Number(amount),
      source_type: "closing",
      source_lead_id: lead.id,
      description: description || `Sale: ${lead.name}`,
    });
  };

  const handleAddIncentive = () => {
    if (!amount) {
      toast({ title: "Error", description: "Please enter an amount", variant: "destructive" });
      return;
    }
    addMutation.mutate({
      amount: Number(amount),
      source_type: "incentive",
      description: description || "Additional Incentive",
    });
    setAmount("");
    setDescription("");
  };

  const salesWithoutEarnings = closedSales?.filter(s => !s.has_earning) || [];
  const salesWithEarnings = closedSales?.filter(s => s.has_earning) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "ghost" ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 px-3"
            data-testid="button-update-incentives"
          >
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">Add Incentive</span>
          </Button>
        ) : (
          <Button
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            data-testid="button-update-incentives"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Update Incentives
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Update Incentives</DialogTitle>
          <DialogDescription>
            Add values to your closed sales or record additional incentives
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 border-b pb-2">
          <button
            onClick={() => setActiveTab("sales")}
            className={cn(
              "px-4 py-2 text-sm rounded-lg transition-all",
              activeTab === "sales" 
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium" 
                : "text-muted-foreground hover:bg-muted"
            )}
            data-testid="tab-closed-sales"
          >
            Closed Sales ({salesWithoutEarnings.length})
          </button>
          <button
            onClick={() => setActiveTab("additional")}
            className={cn(
              "px-4 py-2 text-sm rounded-lg transition-all",
              activeTab === "additional" 
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium" 
                : "text-muted-foreground hover:bg-muted"
            )}
            data-testid="tab-additional-incentive"
          >
            Additional Incentive
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === "sales" ? (
            <div className="space-y-3">
              {loadingSales ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : salesWithoutEarnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No pending sales to add values to.</p>
                  {salesWithEarnings.length > 0 && (
                    <p className="text-xs mt-2 text-green-600">{salesWithEarnings.length} sale(s) already recorded</p>
                  )}
                </div>
              ) : (
                salesWithoutEarnings.map((sale) => (
                  <motion.div
                    key={sale.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{sale.name}</p>
                        <p className="text-xs text-muted-foreground">{sale.mobile_no}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        {sale.status}
                      </span>
                    </div>
                    
                    {selectedLead?.id === sale.id ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Enter amount..."
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="flex-1"
                            data-testid={`input-sale-amount-${sale.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddSaleValue(sale)}
                            disabled={!amount || addMutation.isPending}
                            data-testid={`button-save-sale-${sale.id}`}
                          >
                            {addMutation.isPending ? "..." : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedLead(null);
                              setAmount("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        <Input
                          placeholder="Note (optional)"
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          data-testid={`input-sale-note-${sale.id}`}
                        />
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedLead(sale);
                          setAmount("");
                          setDescription("");
                        }}
                        data-testid={`button-add-value-${sale.id}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Value
                      </Button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Record bonuses, performance incentives, or any additional earnings not tied to a specific sale.
              </p>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="incentive_amount">Amount</Label>
                  <Input
                    id="incentive_amount"
                    type="number"
                    placeholder="Enter amount..."
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    data-testid="input-incentive-amount"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="incentive_description">Description</Label>
                  <Input
                    id="incentive_description"
                    placeholder="e.g., Performance bonus, Referral reward"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    data-testid="input-incentive-description"
                  />
                </div>
                
                <Button
                  onClick={handleAddIncentive}
                  disabled={!amount || addMutation.isPending}
                  className="w-full"
                  data-testid="button-add-incentive"
                >
                  {addMutation.isPending ? "Adding..." : "Add Incentive"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditVisionWizard({ 
  visionBoard, 
  onSuccess,
  triggerVariant = "icon"
}: { 
  visionBoard: VisionBoard; 
  onSuccess: () => void;
  triggerVariant?: "icon" | "ghost";
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    goal_amount: visionBoard.goal_amount.toString(),
    currency: visionBoard.currency || "INR",
    goal_description: visionBoard.goal_description || "",
    start_date: visionBoard.start_date 
      ? format(new Date(visionBoard.start_date), "yyyy-MM-dd") 
      : format(new Date(visionBoard.created_at), "yyyy-MM-dd"),
    target_date: format(new Date(visionBoard.target_date), "yyyy-MM-dd"),
    images: (visionBoard.images || []) as { url: string; caption?: string }[],
    effort_targets: visionBoard.effort_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setFormData({
        goal_amount: visionBoard.goal_amount.toString(),
        currency: visionBoard.currency || "INR",
        goal_description: visionBoard.goal_description || "",
        start_date: visionBoard.start_date 
          ? format(new Date(visionBoard.start_date), "yyyy-MM-dd") 
          : format(new Date(visionBoard.created_at), "yyyy-MM-dd"),
        target_date: format(new Date(visionBoard.target_date), "yyyy-MM-dd"),
        images: (visionBoard.images || []) as { url: string; caption?: string }[],
        effort_targets: visionBoard.effort_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
      });
    }
  }, [open, visionBoard]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/vision-board/${visionBoard.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board", visionBoard.id, "progress"] });
      toast({ title: "Vision Board Updated!", description: "Your changes have been saved." });
      setOpen(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addImage = () => {
    if (imageUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, { url: imageUrl.trim(), caption: imageCaption.trim() || undefined }],
      }));
      setImageUrl("");
      setImageCaption("");
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!formData.goal_amount || Number(formData.goal_amount) <= 0) {
      toast({ title: "Error", description: "Please enter a valid goal amount", variant: "destructive" });
      return;
    }
    if (!formData.start_date || !formData.target_date) {
      toast({ title: "Error", description: "Please select start and end dates", variant: "destructive" });
      return;
    }
    if (new Date(formData.start_date) >= new Date(formData.target_date)) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    
    updateMutation.mutate({
      goal_amount: Number(formData.goal_amount),
      currency: formData.currency,
      goal_description: formData.goal_description,
      start_date: new Date(formData.start_date).toISOString(),
      target_date: new Date(formData.target_date).toISOString(),
      images: formData.images,
      effort_targets: formData.effort_targets,
    });
  };

  const yearlyToMonthly = (yearly: number) => Math.ceil(yearly / 12);
  const yearlyToWeekly = (yearly: number) => Math.ceil(yearly / 52);
  const yearlyToDaily = (yearly: number) => Math.ceil(yearly / 365);

  const isStep1Valid = formData.goal_amount && formData.start_date && formData.target_date && 
    new Date(formData.start_date) < new Date(formData.target_date);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "ghost" ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 px-3"
            data-testid="button-edit-vision"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">Edit Goal</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-edit-vision"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-2 p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <Edit2 className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-xl">Edit Vision Board</DialogTitle>
          <DialogDescription>
            Step {step} of 4 - {step === 1 ? "Goal Settings" : step === 2 ? "Dream Images" : step === 3 ? "Effort Targets" : "Review & Save"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="edit-step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="edit_goal_amount">Goal Amount</Label>
                    <Input
                      id="edit_goal_amount"
                      type="number"
                      placeholder="e.g., 1000000"
                      value={formData.goal_amount}
                      onChange={e => setFormData(prev => ({ ...prev, goal_amount: e.target.value }))}
                      data-testid="input-edit-goal-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={value => setFormData(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger data-testid="select-edit-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">₹ INR</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                        <SelectItem value="EUR">€ EUR</SelectItem>
                        <SelectItem value="GBP">£ GBP</SelectItem>
                        <SelectItem value="AED">د.إ AED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_start_date">Start Date</Label>
                    <Input
                      id="edit_start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      data-testid="input-edit-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_target_date">End Date</Label>
                    <Input
                      id="edit_target_date"
                      type="date"
                      value={formData.target_date}
                      onChange={e => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                      data-testid="input-edit-target-date"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_goal_description">Goal Description</Label>
                  <Textarea
                    id="edit_goal_description"
                    placeholder="Describe your dream - buying a house, car, vacation, etc."
                    value={formData.goal_description}
                    onChange={e => setFormData(prev => ({ ...prev, goal_description: e.target.value }))}
                    rows={3}
                    data-testid="input-edit-goal-description"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="edit-step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit_image_url">Image URL</Label>
                      <Input
                        id="edit_image_url"
                        type="url"
                        placeholder="https://example.com/dream-image.jpg"
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        data-testid="input-edit-image-url"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_image_caption">Caption (optional)</Label>
                      <Input
                        id="edit_image_caption"
                        placeholder="My dream home..."
                        value={imageCaption}
                        onChange={e => setImageCaption(e.target.value)}
                        data-testid="input-edit-image-caption"
                      />
                    </div>
                    <Button onClick={addImage} disabled={!imageUrl.trim()} variant="outline" data-testid="button-edit-add-image">
                      <Plus className="h-4 w-4 mr-2" /> Add Image
                    </Button>
                  </div>
                  
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border">
                          <img src={img.url} alt={img.caption || "Dream"} className="w-full h-24 object-cover" />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(idx)}
                            data-testid={`button-edit-remove-image-${idx}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          {img.caption && (
                            <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                              {img.caption}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {formData.images.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Add images of your dreams to stay motivated</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="edit-step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Set your yearly effort targets. These will be auto-calculated for daily, weekly, and monthly views.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_effort_sales" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" /> Sales (Yearly)
                    </Label>
                    <Input
                      id="edit_effort_sales"
                      type="number"
                      min="0"
                      value={formData.effort_targets.sales}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        effort_targets: { ...prev.effort_targets, sales: Number(e.target.value) || 0 }
                      }))}
                      data-testid="input-edit-effort-sales"
                    />
                    <p className="text-xs text-muted-foreground">
                      = {yearlyToMonthly(formData.effort_targets.sales)}/mo, {yearlyToWeekly(formData.effort_targets.sales)}/wk, {yearlyToDaily(formData.effort_targets.sales)}/day
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit_effort_visits" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" /> Visits (Yearly)
                    </Label>
                    <Input
                      id="edit_effort_visits"
                      type="number"
                      min="0"
                      value={formData.effort_targets.visits}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        effort_targets: { ...prev.effort_targets, visits: Number(e.target.value) || 0 }
                      }))}
                      data-testid="input-edit-effort-visits"
                    />
                    <p className="text-xs text-muted-foreground">
                      = {yearlyToMonthly(formData.effort_targets.visits)}/mo, {yearlyToWeekly(formData.effort_targets.visits)}/wk, {yearlyToDaily(formData.effort_targets.visits)}/day
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit_effort_leads" className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" /> New Leads (Yearly)
                    </Label>
                    <Input
                      id="edit_effort_leads"
                      type="number"
                      min="0"
                      value={formData.effort_targets.leads_attended}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        effort_targets: { ...prev.effort_targets, leads_attended: Number(e.target.value) || 0 }
                      }))}
                      data-testid="input-edit-effort-leads"
                    />
                    <p className="text-xs text-muted-foreground">
                      = {yearlyToMonthly(formData.effort_targets.leads_attended)}/mo, {yearlyToWeekly(formData.effort_targets.leads_attended)}/wk, {yearlyToDaily(formData.effort_targets.leads_attended)}/day
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit_effort_followups" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-orange-500" /> Follow-ups (Yearly)
                    </Label>
                    <Input
                      id="edit_effort_followups"
                      type="number"
                      min="0"
                      value={formData.effort_targets.followups}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        effort_targets: { ...prev.effort_targets, followups: Number(e.target.value) || 0 }
                      }))}
                      data-testid="input-edit-effort-followups"
                    />
                    <p className="text-xs text-muted-foreground">
                      = {yearlyToMonthly(formData.effort_targets.followups)}/mo, {yearlyToWeekly(formData.effort_targets.followups)}/wk, {yearlyToDaily(formData.effort_targets.followups)}/day
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="edit-step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Goal Amount</span>
                    <span className="font-bold text-lg">
                      {currencySymbols[formData.currency] || formData.currency}{Number(formData.goal_amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Timeline</span>
                    <span className="text-sm">
                      {format(new Date(formData.start_date), "MMM d, yyyy")} - {format(new Date(formData.target_date), "MMM d, yyyy")}
                    </span>
                  </div>
                  {formData.goal_description && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Description</span>
                      <p className="mt-1">{formData.goal_description}</p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground mb-1">Dream Images</p>
                    <p className="font-medium">{formData.images.length} image(s)</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground mb-1">Yearly Targets</p>
                    <p className="font-medium text-xs">
                      {formData.effort_targets.sales} sales, {formData.effort_targets.visits} visits
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <DialogFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => step === 1 ? setOpen(false) : setStep(prev => prev - 1)}
            data-testid="button-edit-wizard-back"
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => setStep(prev => prev + 1)}
              disabled={step === 1 && !isStep1Valid}
              data-testid="button-edit-wizard-next"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
              data-testid="button-edit-wizard-save"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VisionBoardPage() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  
  // Super admin check - they don't have a company
  if (user && !user.company_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Star className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Vision Board</CardTitle>
            <CardDescription className="text-base">
              Vision Board is a personal goal tracking feature for company team members. 
              As a Super Admin, you can view company-wide vision boards through the admin panel 
              once you select a company to manage.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>To access Vision Board features, please log in as a company admin or user account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { data: apiResponse, isLoading: boardLoading } = useQuery<VisionBoardApiResponse>({
    queryKey: ["/api/vision-board"],
  });

  // Determine if this is team view or personal view
  const isTeamView = apiResponse?.mode === 'team';
  const visionBoard = isTeamView ? null : apiResponse?.board;
  const teamAggregate = isTeamView ? apiResponse?.aggregate : null;
  const teamProgress = isTeamView ? apiResponse?.progress : null;
  const boardCount = apiResponse?.board_count || 0;

  const { data: progress, isLoading: progressLoading, refetch: refetchProgress } = useQuery<VisionBoardProgress>({
    queryKey: ["/api/vision-board", visionBoard?.id, "progress"],
    enabled: !!visionBoard?.id && !isTeamView,
  });

  const { data: earnings } = useQuery<VisionBoardEarning[]>({
    queryKey: ["/api/vision-board", visionBoard?.id, "earnings"],
    enabled: !!visionBoard?.id && !isTeamView,
  });

  // Fetch user's own pipeline data for projected incentive (Vision Board dual-ring)
  interface MyPipelineResponse {
    projected_incentive: number;
    actual_incentive: number;
    currency: string;
    stages: Array<{
      stage_number: number;
      stage_name: string;
      color: string;
      count: number;
      incentives: number;
      projected_incentive: number;
      is_final_stage: boolean;
    }>;
  }
  
  const { data: myPipelineData } = useQuery<MyPipelineResponse>({
    queryKey: ["/api/vision-board/my-pipeline"],
    enabled: !isTeamView && !!user?.id,
  });
  
  // Use projected incentive directly from API response
  const userProjectedData = {
    projectedIncentive: myPipelineData?.projected_incentive || 0,
    actualIncentive: myPipelineData?.actual_incentive || 0,
  };

  if (boardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-40 w-40 rounded-full mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  // Team view with no boards - show empty state
  if (isTeamView && (!teamAggregate || boardCount === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Users className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Team Vision Board</CardTitle>
            <CardDescription className="text-base">
              No team members have created vision boards yet.
              As an admin or multi-sheet user, you can view team totals once team members set up their vision boards.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>Team members can access Vision Board to set their personal goals and track progress.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Personal view - show setup wizard if no board
  if (!isTeamView && !visionBoard) {
    return <SetupWizard onComplete={() => queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] })} />;
  }

  // Unified data for both team and personal views
  const teamTotals = teamProgress?.team_totals;
  const displayData = isTeamView && teamAggregate ? {
    goalAmount: teamTotals?.total_goal || 0,
    goalDescription: `Team Total (${boardCount} members)`,
    currency: teamAggregate.currency || "INR",
    images: (teamAggregate.images || []).map((url: string) => ({ url, caption: "" })),
    progressPercent: teamTotals?.overall_progress_percent || 0,
    earned: teamTotals?.total_earnings || 0,
    remaining: Math.max(0, (teamTotals?.total_goal || 0) - (teamTotals?.total_earnings || 0)),
    projectedIncentive: 0,
    actualIncentive: 0,
    projectedProgressPercent: 0,
    effortTargets: teamAggregate.effort_targets || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
    effortAchieved: teamProgress?.team_effort_achieved?.[selectedPeriod] || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
    targetDate: new Date(teamAggregate.target_date),
    startDate: new Date(teamAggregate.start_date),
  } : visionBoard ? {
    goalAmount: visionBoard.goal_amount,
    goalDescription: visionBoard.goal_description,
    currency: visionBoard.currency || "INR",
    images: visionBoard.images || [],
    progressPercent: progress?.earnings.progress_percent || 0,
    earned: progress?.earnings.total || 0,
    remaining: progress?.earnings.remaining || 0,
    // Use projected incentive from Conversion Settings user pipeline (not backend calculation)
    projectedIncentive: userProjectedData.projectedIncentive,
    actualIncentive: userProjectedData.actualIncentive,
    // Calculate projected progress percent = (projected incentive / goal amount) × 100
    projectedProgressPercent: visionBoard.goal_amount > 0 
      ? Math.min(100, (userProjectedData.projectedIncentive / visionBoard.goal_amount) * 100) 
      : 0,
    effortTargets: progress?.effort_targets?.[selectedPeriod] || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
    effortAchieved: progress?.effort_achieved?.[selectedPeriod] || { sales: 0, visits: 0, leads_attended: 0, followups: 0 },
    targetDate: new Date(visionBoard.target_date),
    startDate: visionBoard.start_date ? new Date(visionBoard.start_date) : new Date(visionBoard.created_at!),
  } : null;

  if (!displayData) return null;

  const currency = displayData.currency;
  const currencySymbol = currencySymbols[currency] || currency;
  const images = displayData.images;
  const currentTargets = displayData.effortTargets;
  const currentAchieved = displayData.effortAchieved;
  
  // Labels for team vs personal view
  const labels = isTeamView ? {
    headerTitle: "Team Goal",
    progressLabel: "Team Progress",
    progressSubLabel: "Total Completed",
    earnedLabel: "Team Earned",
    remainingLabel: "Team Remaining",
    effortTitle: "Team Effort Targets",
  } : {
    headerTitle: "Your Dream",
    progressLabel: "Vision Progress",
    progressSubLabel: "Completed",
    earnedLabel: "Earned",
    remainingLabel: "Remaining",
    effortTitle: "Effort Targets",
  };

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      {images.length > 0 ? (
        <div className="relative h-[40vh] min-h-[300px]">
          <ImageCarousel images={images} />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-white"
            >
              {isTeamView && (
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Team Total ({boardCount} members)</span>
                </div>
              )}
              <p className="text-sm uppercase tracking-wider mb-2 opacity-80">{labels.headerTitle}</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                {formatCurrency(displayData.goalAmount, currency)}
              </h1>
              {displayData.goalDescription && (
                <p className="text-lg opacity-90">{displayData.goalDescription}</p>
              )}
            </motion.div>
          </div>
        </div>
      ) : (
        <div className={cn(
          "relative h-[30vh] min-h-[200px] flex items-center justify-center",
          isTeamView 
            ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-500"
            : "bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500"
        )}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-white"
          >
            {isTeamView && (
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Team Total ({boardCount} members)</span>
              </div>
            )}
            <p className="text-sm uppercase tracking-wider mb-2 opacity-80">{labels.headerTitle}</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              {formatCurrency(displayData.goalAmount, currency)}
            </h1>
            {displayData.goalDescription && (
              <p className="text-lg opacity-90">{displayData.goalDescription}</p>
            )}
          </motion.div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{labels.progressLabel}</span>
                </div>
                <div className="flex flex-col items-center">
                  {!isTeamView && myPipelineData && myPipelineData.stages && myPipelineData.stages.length > 0 ? (
                    <DualRingProgress 
                      actualProgress={displayData.progressPercent}
                      projectedProgress={displayData.projectedProgressPercent}
                      size={180}
                      outerStrokeWidth={8}
                      innerStrokeWidth={12}
                    >
                      <div className="text-center px-2" data-testid="dual-ring-center-content">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8, duration: 0.5 }}
                        >
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-actual-earned">
                            {formatCurrency(displayData.earned || 0, currency)}
                          </p>
                          <p className="text-xs text-muted-foreground -mt-0.5">of</p>
                          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400" data-testid="text-projected-incentive">
                            {formatCurrency(displayData.projectedIncentive || 0, currency)}
                          </p>
                        </motion.div>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.2 }}
                          className="text-[10px] font-medium mt-1 bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent"
                          data-testid="text-motivational-message"
                        >
                          {getMotivationalMessage(displayData.progressPercent || 0, displayData.projectedProgressPercent || 0)}
                        </motion.p>
                      </div>
                    </DualRingProgress>
                  ) : (
                    <CircularProgress 
                      progress={displayData.progressPercent}
                      size={180}
                      strokeWidth={14}
                    >
                      <div className="text-center">
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.8 }}
                          className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent"
                        >
                          {Math.round(displayData.progressPercent)}%
                        </motion.p>
                        <p className="text-xs text-muted-foreground mt-1">{labels.progressSubLabel}</p>
                      </div>
                    </CircularProgress>
                  )}
                  
                  {!isTeamView && myPipelineData && myPipelineData.stages && myPipelineData.stages.length > 0 && (
                    <div className="flex items-center justify-center gap-4 mt-2 text-xs" data-testid="dual-ring-legend">
                      <div className="flex items-center gap-1.5" data-testid="legend-projected">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-muted-foreground">
                          Projected {Math.round(displayData.projectedProgressPercent || 0)}% 
                          <span className="font-medium text-amber-600 dark:text-amber-400" data-testid="card-projected">
                            ({formatCurrency(displayData.projectedIncentive || 0, currency)})
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5" data-testid="legend-actual">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-muted-foreground">
                          Actual {Math.round(displayData.progressPercent || 0)}% 
                          <span className="font-medium text-emerald-600 dark:text-emerald-400" data-testid="card-actual">
                            ({formatCurrency(displayData.earned || 0, currency)})
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 w-full">
                    {!isTeamView && myPipelineData && myPipelineData.stages && myPipelineData.stages.length > 0 ? (
                      <div data-testid="compact-stats">
                        <div className="pt-1" data-testid="remaining-section-dual">
                          <p className="text-xs text-muted-foreground text-center mb-1.5">{labels.remainingLabel}</p>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 text-center py-1 px-2 rounded bg-amber-50 dark:bg-amber-950/30">
                              <p className="text-[10px] text-amber-600 dark:text-amber-400">Projected</p>
                              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                {formatCurrency(Math.max(0, (visionBoard?.goal_amount || 0) - (displayData.projectedIncentive || 0)), currency)}
                              </p>
                            </div>
                            <div className="flex-1 text-center py-1 px-2 rounded bg-emerald-50 dark:bg-emerald-950/30">
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Actual</p>
                              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                {formatCurrency(displayData.remaining || 0, currency)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">{labels.earnedLabel}</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(displayData.earned, currency)}
                          </p>
                        </div>
                        <div className="border-t pt-2">
                          <p className="text-sm text-muted-foreground">{labels.remainingLabel}</p>
                          <p className="text-xl font-semibold">
                            {formatCurrency(displayData.remaining, currency)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                </div>
              </CardContent>
            </Card>
            
            {!isTeamView && visionBoard && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-3"
              >
                <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-center gap-3" data-testid="action-bar">
                      <EditVisionWizard 
                        visionBoard={visionBoard} 
                        onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] });
                          refetchProgress();
                        }}
                        triggerVariant="ghost"
                      />
                      <div className="h-4 w-px bg-border" />
                      <UpdateIncentivesDialog 
                        visionBoardId={visionBoard.id} 
                        onSuccess={() => refetchProgress()}
                        triggerVariant="ghost"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs">
                  {getMotivationalMessage(
                    progress?.earnings.progress_percent || 0, 
                    progress?.earnings.projected_progress_percent || progress?.earnings.progress_percent || 0
                  )}
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-4"
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <span className="font-semibold">Goal Timeline</span>
                  </div>
                  
                  <div className="text-center py-3">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {progress?.timeline.days_remaining || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">days remaining</p>
                  </div>
                  
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress?.timeline.time_progress_percent || 0}%` }}
                      transition={{ duration: 1, delay: 0.7 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50">
                      <p className="text-lg font-bold">
                        {Math.ceil((progress?.timeline.days_remaining || 0) / 7)}
                      </p>
                      <p className="text-xs text-muted-foreground">weeks</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50">
                      <p className="text-lg font-bold">
                        {Math.ceil((progress?.timeline.days_remaining || 0) / 30)}
                      </p>
                      <p className="text-xs text-muted-foreground">months</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50">
                      <p className="text-lg font-bold">
                        {Math.round(progress?.timeline.time_progress_percent || 0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">elapsed</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-center text-muted-foreground border-t pt-3">
                    Target: {format(displayData.targetDate, "MMMM d, yyyy")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    {labels.effortTitle}
                  </CardTitle>
                  {!isTeamView && (
                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      {(["daily", "weekly", "monthly", "yearly"] as const).map((period) => {
                        const periodLabels: Record<typeof period, string> = {
                          daily: "Today",
                          weekly: "This Week",
                          monthly: "This Month",
                          yearly: "This Year"
                        };
                        return (
                          <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={cn(
                              "px-3 py-1.5 text-sm rounded-md transition-all",
                              selectedPeriod === period
                                ? "bg-white dark:bg-slate-600 shadow font-medium"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            data-testid={`button-period-${period}`}
                          >
                            {periodLabels[period]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {isTeamView && (
                    <span className="text-sm text-muted-foreground">Total Yearly Targets</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <EffortMetricCard
                    icon={Users}
                    label="New Leads"
                    target={currentTargets.leads_attended}
                    achieved={currentAchieved.leads_attended}
                    gradient="from-purple-400 to-pink-500"
                    delay={0.1}
                  />
                  <EffortMetricCard
                    icon={MessageSquare}
                    label="Follow-ups"
                    target={currentTargets.followups}
                    achieved={currentAchieved.followups}
                    gradient="from-orange-400 to-red-500"
                    delay={0.2}
                  />
                  <EffortMetricCard
                    icon={MapPin}
                    label="Visits"
                    target={currentTargets.visits}
                    achieved={currentAchieved.visits}
                    gradient="from-blue-400 to-cyan-500"
                    delay={0.3}
                  />
                  <EffortMetricCard
                    icon={CheckCircle2}
                    label="Sales"
                    target={currentTargets.sales}
                    achieved={currentAchieved.sales}
                    gradient="from-green-400 to-emerald-500"
                    delay={0.4}
                  />
                </div>
                
                <p className="text-xs text-center text-muted-foreground mt-6">
                  Effort metrics are auto-tracked based on your lead activities
                </p>
              </CardContent>
            </Card>
            
            {earnings && earnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="mt-6 border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Recent Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {earnings.slice(0, 10).map((earning, idx) => (
                        <motion.div
                          key={earning.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              earning.source_type === "closing"
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-purple-100 dark:bg-purple-900/30"
                            )}>
                              {earning.source_type === "closing" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <Star className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {earning.source_type === "closing" ? "Sale" : "Incentive"}
                              </p>
                              {earning.description && (
                                <p className="text-xs text-muted-foreground">{earning.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600 dark:text-green-400">
                              +{formatCurrency(earning.amount, currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(earning.earned_at), "MMM d")}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

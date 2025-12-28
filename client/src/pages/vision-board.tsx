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

function getMotivationalMessage(progressPercent: number): string {
  if (progressPercent >= 90) return "Almost there! The finish line is in sight!";
  if (progressPercent >= 75) return "Incredible progress! Keep the momentum going!";
  if (progressPercent >= 50) return "Halfway there! You're on fire!";
  if (progressPercent >= 25) return "Great start! Keep building that momentum!";
  return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
}

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
    createMutation.mutate({
      ...formData,
      goal_amount: Number(formData.goal_amount),
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="target_date">Target Date</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={formData.target_date}
                      onChange={e => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                      data-testid="input-target-date"
                    />
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
                  disabled={step === 1 && (!formData.goal_amount || !formData.target_date)}
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

function AddEarningDialog({ 
  visionBoardId, 
  onSuccess 
}: { 
  visionBoardId: string; 
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [sourceType, setSourceType] = useState<"closing" | "incentive">("closing");
  const [description, setDescription] = useState("");

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/vision-board/${visionBoardId}/earnings`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board", visionBoardId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board", visionBoardId, "earnings"] });
      toast({ title: "Earning Added!", description: "Your progress has been updated!" });
      setOpen(false);
      setAmount("");
      setDescription("");
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          data-testid="button-add-earning"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Earning
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Earning</DialogTitle>
          <DialogDescription>
            Record a closing or incentive to track your progress
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={sourceType} onValueChange={(v: "closing" | "incentive") => setSourceType(v)}>
              <SelectTrigger data-testid="select-earning-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="closing">Closing (Sale)</SelectItem>
                <SelectItem value="incentive">Incentive / Bonus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="earning_amount">Amount</Label>
            <Input
              id="earning_amount"
              type="number"
              placeholder="Enter amount..."
              value={amount}
              onChange={e => setAmount(e.target.value)}
              data-testid="input-earning-amount"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="earning_description">Description (optional)</Label>
            <Input
              id="earning_description"
              placeholder="e.g., Deal with Mr. Sharma"
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="input-earning-description"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => addMutation.mutate({
              amount: Number(amount),
              source_type: sourceType,
              description: description || undefined,
            })}
            disabled={!amount || addMutation.isPending}
            data-testid="button-submit-earning"
          >
            {addMutation.isPending ? "Adding..." : "Add Earning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VisionBoardPage() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  
  const { data: visionBoard, isLoading: boardLoading } = useQuery<VisionBoard | null>({
    queryKey: ["/api/vision-board"],
  });

  const { data: progress, isLoading: progressLoading, refetch: refetchProgress } = useQuery<VisionBoardProgress>({
    queryKey: ["/api/vision-board", visionBoard?.id, "progress"],
    enabled: !!visionBoard?.id,
  });

  const { data: earnings } = useQuery<VisionBoardEarning[]>({
    queryKey: ["/api/vision-board", visionBoard?.id, "earnings"],
    enabled: !!visionBoard?.id,
  });

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

  if (!visionBoard) {
    return <SetupWizard onComplete={() => queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] })} />;
  }

  const currency = visionBoard.currency || "INR";
  const currencySymbol = currencySymbols[currency] || currency;
  const images = visionBoard.images || [];
  const currentTargets = progress?.effort_targets?.[selectedPeriod] || { sales: 0, visits: 0, leads_attended: 0, followups: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
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
              <p className="text-sm uppercase tracking-wider mb-2 opacity-80">Your Dream</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                {formatCurrency(visionBoard.goal_amount, currency)}
              </h1>
              {visionBoard.goal_description && (
                <p className="text-lg opacity-90">{visionBoard.goal_description}</p>
              )}
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="relative h-[30vh] min-h-[200px] bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-white"
          >
            <p className="text-sm uppercase tracking-wider mb-2 opacity-80">Your Dream</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              {formatCurrency(visionBoard.goal_amount, currency)}
            </h1>
            {visionBoard.goal_description && (
              <p className="text-lg opacity-90">{visionBoard.goal_description}</p>
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
                <div className="flex flex-col items-center">
                  <CircularProgress 
                    progress={progress?.earnings.progress_percent || 0}
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
                        {Math.round(progress?.earnings.progress_percent || 0)}%
                      </motion.p>
                      <p className="text-xs text-muted-foreground mt-1">Completed</p>
                    </div>
                  </CircularProgress>
                  
                  <div className="mt-6 text-center space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Earned</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(progress?.earnings.total || 0, currency)}
                      </p>
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-sm text-muted-foreground">Remaining</p>
                      <p className="text-xl font-semibold">
                        {formatCurrency(progress?.earnings.remaining || 0, currency)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-full mt-6 flex gap-2">
                    <AddEarningDialog 
                      visionBoardId={visionBoard.id} 
                      onSuccess={() => refetchProgress()} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  {getMotivationalMessage(progress?.earnings.progress_percent || 0)}
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-4"
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Days Remaining</span>
                    </div>
                    <span className="font-bold text-lg">{progress?.timeline.days_remaining || 0}</span>
                  </div>
                  <div className="mt-3 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress?.timeline.time_progress_percent || 0}%` }}
                      transition={{ duration: 1, delay: 0.7 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Target: {format(new Date(visionBoard.target_date), "MMMM d, yyyy")}
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
                    Effort Targets
                  </CardTitle>
                  <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    {(["daily", "weekly", "monthly", "yearly"] as const).map((period) => (
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
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <EffortMetricCard
                    icon={CheckCircle2}
                    label="Sales"
                    target={currentTargets.sales}
                    achieved={0}
                    gradient="from-green-400 to-emerald-500"
                    delay={0.1}
                  />
                  <EffortMetricCard
                    icon={MapPin}
                    label="Visits"
                    target={currentTargets.visits}
                    achieved={0}
                    gradient="from-blue-400 to-cyan-500"
                    delay={0.2}
                  />
                  <EffortMetricCard
                    icon={Users}
                    label="New Leads"
                    target={currentTargets.leads_attended}
                    achieved={0}
                    gradient="from-purple-400 to-pink-500"
                    delay={0.3}
                  />
                  <EffortMetricCard
                    icon={MessageSquare}
                    label="Follow-ups"
                    target={currentTargets.followups}
                    achieved={0}
                    gradient="from-orange-400 to-red-500"
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

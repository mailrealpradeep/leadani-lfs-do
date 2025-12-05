import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Shield,
  Users,
  Zap,
  Target,
  BarChart3,
  Clock,
  Smartphone,
  Upload,
  Download,
  RefreshCw,
  Bell,
  Globe,
  Lock,
  Eye,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Palette,
  Settings,
  UserPlus,
  Building2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Trophy,
  FileSpreadsheet,
  Webhook,
  History,
  Trash2,
  CloudUpload,
  LayoutGrid,
  Filter,
  Phone,
  Mail,
  MessageSquare,
  Star,
  Award,
  Timer,
  ClipboardCheck,
  PieChart,
  Users2,
  Repeat,
  Database,
  ShieldCheck,
  Layers,
  MousePointerClick,
  HeartHandshake,
  GraduationCap,
  Stethoscope,
  Home,
  Briefcase,
  Car,
  Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

interface Feature {
  id: string;
  icon: any;
  title: string;
  tagline: string;
  description: string;
  benefits: string[];
  sectors: { name: string; icon: any; useCase: string }[];
  gradient: string;
  iconBg: string;
}

const features: Feature[] = [
  {
    id: "never-lose-lead",
    icon: Shield,
    title: "Never Lose a Single Lead",
    tagline: "Every lead is protected, everywhere",
    description: "Intelligent duplicate detection at every entry point - manual add, bulk import, webhook, or CRM push. Mobile numbers are normalized and matched smartly (strips country codes, compares last 10 digits). When duplicates are found, you choose: merge, skip, or update.",
    benefits: [
      "Zero lost leads due to duplicates",
      "Smart phone number matching across formats",
      "Merge or skip duplicates with one click",
      "Works across all lead entry methods"
    ],
    sectors: [
      { name: "Education", icon: GraduationCap, useCase: "Never lose a student inquiry even if they submit multiple times" },
      { name: "Healthcare", icon: Stethoscope, useCase: "Patient records stay unique, no duplicate appointments" },
      { name: "Real Estate", icon: Home, useCase: "Property inquiries tracked without repetition" },
    ],
    gradient: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-500/10",
  },
  {
    id: "auto-distribution",
    icon: Users,
    title: "Automatic Fair Lead Distribution",
    tagline: "Right lead to right person, automatically",
    description: "Incoming leads are automatically distributed across your team based on custom percentages (e.g., 40% to Priyanka, 30% to Monica, 30% to Santoshi). Weighted round-robin ensures perfect fairness over time. No manual assignment needed.",
    benefits: [
      "Set once, runs forever automatically",
      "Perfectly fair distribution over time",
      "Adjust percentages anytime",
      "No manager intervention required"
    ],
    sectors: [
      { name: "Insurance", icon: Briefcase, useCase: "Distribute policy inquiries evenly across agents" },
      { name: "Education", icon: GraduationCap, useCase: "Balance admission inquiries across counselors" },
      { name: "Recruitment", icon: Users2, useCase: "Fair candidate distribution to recruiters" },
    ],
    gradient: "from-blue-500 to-indigo-600",
    iconBg: "bg-blue-500/10",
  },
  {
    id: "smart-routing",
    icon: Webhook,
    title: "Smart Lead Routing",
    tagline: "Language, region, source - all handled",
    description: "Create powerful routing rules with AND/OR conditions. Route Telugu leads to Telugu-speaking team, Mumbai leads to Mumbai office, Facebook leads to social media specialists. Unlimited conditions, unlimited flexibility.",
    benefits: [
      "Route by language automatically",
      "Route by region/city",
      "Route by lead source (Facebook, Website, etc.)",
      "Combine multiple conditions with AND/OR"
    ],
    sectors: [
      { name: "Pan-India Business", icon: Globe, useCase: "Language-based routing for better customer experience" },
      { name: "Multi-location", icon: Building2, useCase: "Route leads to nearest branch office" },
      { name: "Marketing Teams", icon: Sparkles, useCase: "Route by campaign source for accurate tracking" },
    ],
    gradient: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-500/10",
  },
  {
    id: "visual-highlighting",
    icon: Palette,
    title: "Hot Leads Stand Out Instantly",
    tagline: "12 colors, unlimited rules",
    description: "Create automatic highlighting rules that make important leads pop. Red for urgent, yellow for warm, green for converted. Combine multiple conditions - 'Status is Hot AND Follow-up is Overdue'. Rules can apply per-sheet or globally.",
    benefits: [
      "Instant visual prioritization",
      "12 beautiful color options",
      "Complex multi-condition rules",
      "Sheet-specific or global rules"
    ],
    sectors: [
      { name: "Sales Teams", icon: TrendingUp, useCase: "Highlight high-value leads for priority action" },
      { name: "Support", icon: HeartHandshake, useCase: "Flag urgent tickets in red automatically" },
      { name: "Collections", icon: Clock, useCase: "Color-code by overdue days" },
    ],
    gradient: "from-amber-500 to-orange-600",
    iconBg: "bg-amber-500/10",
  },
  {
    id: "leaderboard",
    icon: Trophy,
    title: "Live Performance Leaderboard",
    tagline: "See who's winning, right now",
    description: "Beautiful animated leaderboard showing top performers based on working targets. Daily, weekly, monthly views with podium display for top 3. Each team member gets a unique icon. Celebrate achievements and drive healthy competition.",
    benefits: [
      "Real-time rankings",
      "Multiple time period views",
      "Animated podium for top 3",
      "Drives healthy competition"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Motivate team with visible rankings" },
      { name: "BPO/Call Centers", icon: Phone, useCase: "Track call targets in real-time" },
      { name: "Recruitment", icon: Users2, useCase: "Rank recruiters by placements" },
    ],
    gradient: "from-yellow-500 to-amber-600",
    iconBg: "bg-yellow-500/10",
  },
  {
    id: "working-targets",
    icon: Target,
    title: "Working Targets Dashboard",
    tagline: "Set goals, track progress, celebrate wins",
    description: "Three types of targets: Fixed (hit exact numbers), Single Column Compliance (follow-up on time), Compare Columns (track conversions). Assign to individuals, teams, or everyone. Real-time progress tracking with beautiful visualizations.",
    benefits: [
      "Multiple target types for flexibility",
      "Individual or team assignments",
      "Real-time progress tracking",
      "Compliance percentage calculations"
    ],
    sectors: [
      { name: "All Industries", icon: Building2, useCase: "Universal goal-setting and tracking system" },
      { name: "Education", icon: GraduationCap, useCase: "Track counselor follow-up compliance" },
      { name: "Insurance", icon: Briefcase, useCase: "Policy renewal targets per agent" },
    ],
    gradient: "from-rose-500 to-pink-600",
    iconBg: "bg-rose-500/10",
  },
  {
    id: "exit-rules",
    icon: ClipboardCheck,
    title: "Ensure Work Completion",
    tagline: "No shortcuts before day ends",
    description: "Configurable exit rules ensure team members complete required work before marking attendance exit. Minimum leads updated, calls made, or follow-ups scheduled. Force exit requires admin approval with reason.",
    benefits: [
      "Ensure daily work is complete",
      "Customizable requirements per team",
      "Force exit with admin approval",
      "Full accountability"
    ],
    sectors: [
      { name: "Call Centers", icon: Phone, useCase: "Ensure minimum calls before shift end" },
      { name: "Sales", icon: TrendingUp, useCase: "Daily follow-up minimums enforced" },
      { name: "Collections", icon: Clock, useCase: "Contact attempt requirements" },
    ],
    gradient: "from-red-500 to-rose-600",
    iconBg: "bg-red-500/10",
  },
  {
    id: "audit-trail",
    icon: Eye,
    title: "Complete Transparency",
    tagline: "Every action is recorded forever",
    description: "Full audit trail of who did what, when. Every lead update, every login, every change. Chronological history per lead shows complete journey from creation to conversion. Compliance-ready reporting.",
    benefits: [
      "Complete accountability",
      "Chronological lead history",
      "Compliance-ready reports",
      "Dispute resolution made easy"
    ],
    sectors: [
      { name: "Finance", icon: Briefcase, useCase: "Regulatory compliance requirements" },
      { name: "Healthcare", icon: Stethoscope, useCase: "Patient interaction records" },
      { name: "Legal", icon: ShieldCheck, useCase: "Document every client interaction" },
    ],
    gradient: "from-slate-500 to-gray-600",
    iconBg: "bg-slate-500/10",
  },
  {
    id: "real-time-sync",
    icon: RefreshCw,
    title: "Real-Time Team Sync",
    tagline: "Everyone sees updates instantly",
    description: "When one team member updates a lead, everyone sees it immediately. No refresh needed. Live collaboration without conflicts. Perfect for distributed teams working on shared leads.",
    benefits: [
      "Instant updates across all users",
      "No refresh button needed",
      "Works across locations",
      "Zero data conflicts"
    ],
    sectors: [
      { name: "Remote Teams", icon: Globe, useCase: "Seamless collaboration from anywhere" },
      { name: "Multi-branch", icon: Building2, useCase: "Unified view across locations" },
      { name: "Shift-based", icon: Clock, useCase: "Smooth handoffs between shifts" },
    ],
    gradient: "from-cyan-500 to-teal-600",
    iconBg: "bg-cyan-500/10",
  },
  {
    id: "mobile-first",
    icon: Smartphone,
    title: "Works on Any Phone",
    tagline: "No app install, full power",
    description: "Progressive Web App works like a native app without app store download. Full lead management on mobile - view, edit, filter, sort. Configurable mobile cards show only the fields you need. Push notifications keep you updated.",
    benefits: [
      "No app store, instant access",
      "Full functionality on mobile",
      "Configurable mobile view",
      "Push notifications"
    ],
    sectors: [
      { name: "Field Sales", icon: Car, useCase: "Update leads on the go" },
      { name: "Real Estate", icon: Home, useCase: "Show properties, update status on site" },
      { name: "Travel", icon: Plane, useCase: "Manage bookings from anywhere" },
    ],
    gradient: "from-green-500 to-emerald-600",
    iconBg: "bg-green-500/10",
  },
  {
    id: "bulk-import",
    icon: Upload,
    title: "Bulk Import from Excel",
    tagline: "Thousands of leads in seconds",
    description: "Upload Excel or CSV files with smart column auto-mapping. Preview before import, review duplicates separately, merge or skip. Handles thousands of leads without slowdown. Full validation ensures clean data.",
    benefits: [
      "Smart column auto-detection",
      "Preview before final import",
      "Separate duplicate review step",
      "Handles large files easily"
    ],
    sectors: [
      { name: "Event Marketing", icon: Calendar, useCase: "Import event registrations instantly" },
      { name: "Data Migration", icon: Database, useCase: "Move from old CRM seamlessly" },
      { name: "Campaign Launch", icon: Sparkles, useCase: "Load purchased lead lists" },
    ],
    gradient: "from-indigo-500 to-blue-600",
    iconBg: "bg-indigo-500/10",
  },
  {
    id: "nfdt",
    icon: Calendar,
    title: "Follow-up Tracking (NFDT)",
    tagline: "Never miss a follow-up again",
    description: "Next Follow-up Date Time field with automatic highlighting for overdue items. Dashboard shows who's behind on follow-ups. Compliance tracking ensures no lead goes cold. Team managers see the full picture.",
    benefits: [
      "Visual overdue indicators",
      "Team-wide compliance view",
      "Prevent leads going cold",
      "Manager oversight dashboard"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Ensure timely prospect follow-up" },
      { name: "Customer Success", icon: HeartHandshake, useCase: "Renewal reminder management" },
      { name: "Healthcare", icon: Stethoscope, useCase: "Patient follow-up scheduling" },
    ],
    gradient: "from-orange-500 to-red-600",
    iconBg: "bg-orange-500/10",
  },
  {
    id: "lead-thoughts",
    icon: Star,
    title: "Lead Confidence Marking",
    tagline: "Sure or Maybe - quick tagging",
    description: "One-click tagging to mark leads as 'Sure' (high confidence) or 'May Be' (needs nurturing). Visual highlighting makes it easy to focus on hot prospects. Filter by confidence level for targeted campaigns.",
    benefits: [
      "Quick one-click tagging",
      "Visual differentiation",
      "Focus on high-confidence leads",
      "Better pipeline visibility"
    ],
    sectors: [
      { name: "B2B Sales", icon: Briefcase, useCase: "Prioritize qualified prospects" },
      { name: "Education", icon: GraduationCap, useCase: "Identify serious applicants" },
      { name: "Real Estate", icon: Home, useCase: "Focus on ready-to-buy clients" },
    ],
    gradient: "from-yellow-400 to-orange-500",
    iconBg: "bg-yellow-400/10",
  },
  {
    id: "recurring-tasks",
    icon: Repeat,
    title: "Recurring Tasks",
    tagline: "Daily, weekly, monthly - automated",
    description: "Create tasks that automatically regenerate after completion. Daily morning reports, weekly team meetings, monthly reviews. Link tasks to specific leads for context. Never forget routine activities.",
    benefits: [
      "Auto-regenerating tasks",
      "Link to specific leads",
      "Daily/Weekly/Monthly options",
      "Never forget routine work"
    ],
    sectors: [
      { name: "Account Management", icon: Users2, useCase: "Monthly client check-ins" },
      { name: "Sales", icon: TrendingUp, useCase: "Weekly pipeline reviews" },
      { name: "Operations", icon: Settings, useCase: "Daily process checklists" },
    ],
    gradient: "from-purple-500 to-indigo-600",
    iconBg: "bg-purple-500/10",
  },
  {
    id: "excel-interface",
    icon: LayoutGrid,
    title: "Familiar Excel Interface",
    tagline: "Zero learning curve",
    description: "Spreadsheet-like grid that feels just like Excel. Click to edit, tab to move, copy-paste works. Your team already knows how to use it. Full keyboard navigation for power users.",
    benefits: [
      "Instant familiarity",
      "No training needed",
      "Full keyboard support",
      "Copy-paste works naturally"
    ],
    sectors: [
      { name: "All Industries", icon: Building2, useCase: "Universal spreadsheet familiarity" },
    ],
    gradient: "from-green-600 to-teal-600",
    iconBg: "bg-green-600/10",
  },
  {
    id: "custom-columns",
    icon: Layers,
    title: "Fully Customizable Fields",
    tagline: "Your data, your structure",
    description: "Add any column type - text, number, date, dropdown, multi-select. Dynamic dropdowns that change based on other field values. Validation rules ensure data quality. Reorder and resize columns freely.",
    benefits: [
      "Any field type you need",
      "Dynamic conditional dropdowns",
      "Data validation rules",
      "Full layout control"
    ],
    sectors: [
      { name: "Custom Workflows", icon: Settings, useCase: "Build exactly what you need" },
      { name: "Industry-specific", icon: Building2, useCase: "Add specialized fields" },
    ],
    gradient: "from-fuchsia-500 to-pink-600",
    iconBg: "bg-fuchsia-500/10",
  },
  {
    id: "soft-delete",
    icon: Trash2,
    title: "30-Day Recovery",
    tagline: "Accidents happen, data survives",
    description: "Deleted leads aren't gone forever. They move to a recovery zone for 30 days. Restore with one click. Permanent deletion only after 30 days, and even then with confirmation.",
    benefits: [
      "30-day recovery window",
      "One-click restore",
      "Protection from accidents",
      "Peace of mind"
    ],
    sectors: [
      { name: "All Industries", icon: ShieldCheck, useCase: "Universal data protection" },
    ],
    gradient: "from-red-400 to-pink-500",
    iconBg: "bg-red-400/10",
  },
  {
    id: "google-backup",
    icon: CloudUpload,
    title: "Auto Google Sheets Backup",
    tagline: "Your data, always accessible",
    description: "Automatic hourly backup to your Google Sheets. Your data is always accessible even outside LeadAni. Full lead data including all custom columns and update history. Complete ownership of your data.",
    benefits: [
      "Hourly automatic backups",
      "Data always accessible",
      "Full ownership",
      "No vendor lock-in"
    ],
    sectors: [
      { name: "All Industries", icon: Database, useCase: "Universal data safety" },
    ],
    gradient: "from-blue-400 to-green-500",
    iconBg: "bg-blue-400/10",
  },
  {
    id: "snapshots",
    icon: History,
    title: "Point-in-Time Recovery",
    tagline: "Go back to any hour",
    description: "Automatic hourly snapshots of your entire database with 30-day retention. Made a mistake? Restore your sheet to exactly how it was at any hour in the past month. Preview changes before restoring.",
    benefits: [
      "Hourly automatic snapshots",
      "30-day retention",
      "Preview before restore",
      "Full database recovery"
    ],
    sectors: [
      { name: "Enterprise", icon: Building2, useCase: "Critical data protection" },
      { name: "Compliance", icon: ShieldCheck, useCase: "Audit and recovery capabilities" },
    ],
    gradient: "from-indigo-400 to-purple-500",
    iconBg: "bg-indigo-400/10",
  },
  {
    id: "reports",
    icon: BarChart3,
    title: "Powerful Reports & Analytics",
    tagline: "Insights that drive decisions",
    description: "Custom report builder with drill-down capability. Team performance comparisons side by side. Time period analysis - this week vs last, this month vs target. Export reports to Excel.",
    benefits: [
      "Custom report builder",
      "Drill-down to details",
      "Time period comparisons",
      "Excel export"
    ],
    sectors: [
      { name: "Management", icon: Users, useCase: "Strategic decision making" },
      { name: "Operations", icon: Settings, useCase: "Process optimization" },
    ],
    gradient: "from-teal-500 to-cyan-600",
    iconBg: "bg-teal-500/10",
  },
  {
    id: "rbac",
    icon: Lock,
    title: "Role-Based Access Control",
    tagline: "Right people, right access",
    description: "Three-tier access: Super Admin (multi-company), Company Admin (full company control), User (assigned sheets only). Sheet-level permissions control who sees what. Audit logs track all access.",
    benefits: [
      "Three-tier hierarchy",
      "Sheet-level permissions",
      "Audit logging",
      "Complete access control"
    ],
    sectors: [
      { name: "Enterprise", icon: Building2, useCase: "Multi-department access control" },
      { name: "Franchises", icon: Globe, useCase: "Location-based permissions" },
    ],
    gradient: "from-gray-500 to-slate-600",
    iconBg: "bg-gray-500/10",
  },
  {
    id: "self-service",
    icon: UserPlus,
    title: "Easy Team Onboarding",
    tagline: "Add members in seconds",
    description: "Self-service company signup with guided wizard. Invite team members with one click - they get email with setup link. Role assignment during invitation. No IT support needed.",
    benefits: [
      "Guided signup wizard",
      "One-click invitations",
      "Role pre-assignment",
      "Zero IT overhead"
    ],
    sectors: [
      { name: "Startups", icon: Sparkles, useCase: "Quick team scaling" },
      { name: "SMBs", icon: Building2, useCase: "No IT department needed" },
    ],
    gradient: "from-emerald-400 to-green-500",
    iconBg: "bg-emerald-400/10",
  },
  {
    id: "timezone",
    icon: Globe,
    title: "Company Timezone Support",
    tagline: "Time makes sense, everywhere",
    description: "All timestamps displayed in your company's timezone. Webhook timestamps automatically converted. No confusion for distributed teams. 100+ timezones supported.",
    benefits: [
      "Consistent time display",
      "Automatic conversion",
      "No timezone confusion",
      "100+ zones supported"
    ],
    sectors: [
      { name: "Global Teams", icon: Globe, useCase: "Unified time understanding" },
      { name: "Multi-timezone", icon: Clock, useCase: "Clear communication across zones" },
    ],
    gradient: "from-sky-400 to-blue-500",
    iconBg: "bg-sky-400/10",
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-300 cursor-pointer",
          "hover:shadow-lg hover:shadow-primary/5",
          isOpen && "ring-2 ring-primary/20"
        )}
        onClick={() => setIsOpen(!isOpen)}
        data-testid={`feature-card-${feature.id}`}
      >
        <CardContent className="p-0">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <motion.div 
                className={cn(
                  "flex-shrink-0 p-3 rounded-xl",
                  `bg-gradient-to-br ${feature.gradient}`
                )}
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <feature.icon className="h-6 w-6 text-white" />
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-lg">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{feature.tagline}</p>
                  </div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 mt-1"
                  >
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 space-y-6">
                  <div className="pt-4 border-t">
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Key Benefits
                    </h4>
                    <div className="grid gap-2">
                      {feature.benefits.map((benefit, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            `bg-gradient-to-r ${feature.gradient}`
                          )} />
                          {benefit}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {feature.sectors.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        Industry Applications
                      </h4>
                      <div className="grid gap-3">
                        {feature.sectors.map((sector, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <div className={cn(
                              "p-2 rounded-lg",
                              feature.iconBg
                            )}>
                              <sector.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{sector.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{sector.useCase}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 md:py-32">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <motion.div 
        className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 px-4 py-1.5 text-sm" variant="secondary">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Built for Growing Businesses
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold tracking-tight"
          >
            Features That
            <span className="block mt-2 bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent">
              Transform Your Business
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Every feature designed to help you capture more leads, manage your team better, 
            and never lose a single opportunity. Built by teams, for teams.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/signup">
              <Button size="lg" className="gap-2 px-8">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="gap-2 px-8">
                Sign In
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { value: "50K+", label: "Leads Managed" },
              { value: "500+", label: "Happy Users" },
              { value: "99.9%", label: "Uptime" },
              { value: "24/7", label: "Support" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function CategorySection({ 
  title, 
  subtitle,
  icon: Icon,
  features: categoryFeatures,
  gradient,
  startIndex
}: { 
  title: string; 
  subtitle: string;
  icon: any;
  features: Feature[];
  gradient: string;
  startIndex: number;
}) {
  return (
    <section className="py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <div className={cn(
          "inline-flex items-center justify-center p-3 rounded-2xl mb-4",
          `bg-gradient-to-br ${gradient}`
        )}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">{subtitle}</p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categoryFeatures.map((feature, index) => (
          <FeatureCard key={feature.id} feature={feature} index={startIndex + index} />
        ))}
      </div>
    </section>
  );
}

export default function Features() {
  const protectRevenueFeatures = features.slice(0, 4);
  const teamAccountabilityFeatures = features.slice(4, 9);
  const efficiencyFeatures = features.slice(9, 14);
  const customizationFeatures = features.slice(14, 16);
  const dataSafetyFeatures = features.slice(16, 19);
  const reportsFeatures = features.slice(19, 20);
  const adminFeatures = features.slice(20);

  return (
    <div className="min-h-screen bg-background" data-testid="features-page">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <motion.div 
              className="flex items-center gap-2 cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-blue-600">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">LeadAni LFS</span>
            </motion.div>
          </Link>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <HeroSection />

      <main className="container mx-auto px-4 pb-20">
        <CategorySection
          title="Protect Revenue & Never Lose Leads"
          subtitle="Every lead is valuable. These features ensure you never miss an opportunity."
          icon={Shield}
          features={protectRevenueFeatures}
          gradient="from-emerald-500 to-teal-600"
          startIndex={0}
        />

        <CategorySection
          title="Team Accountability & Performance"
          subtitle="Build a high-performing team with complete visibility and healthy competition."
          icon={Trophy}
          features={teamAccountabilityFeatures}
          gradient="from-amber-500 to-orange-600"
          startIndex={4}
        />

        <CategorySection
          title="Operational Efficiency"
          subtitle="Work faster, smarter, and from anywhere."
          icon={Zap}
          features={efficiencyFeatures}
          gradient="from-blue-500 to-indigo-600"
          startIndex={9}
        />

        <CategorySection
          title="Customization & Flexibility"
          subtitle="Your business is unique. Your CRM should adapt to you."
          icon={Settings}
          features={customizationFeatures}
          gradient="from-purple-500 to-pink-600"
          startIndex={14}
        />

        <CategorySection
          title="Data Safety & Peace of Mind"
          subtitle="Your data is precious. We treat it that way."
          icon={ShieldCheck}
          features={dataSafetyFeatures}
          gradient="from-slate-500 to-gray-600"
          startIndex={16}
        />

        <CategorySection
          title="Reports & Insights"
          subtitle="Turn data into actionable intelligence."
          icon={BarChart3}
          features={reportsFeatures}
          gradient="from-teal-500 to-cyan-600"
          startIndex={19}
        />

        <CategorySection
          title="Administration & Onboarding"
          subtitle="Easy setup, powerful control."
          icon={Users}
          features={adminFeatures}
          gradient="from-gray-500 to-slate-600"
          startIndex={20}
        />

        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center py-16 px-8 rounded-3xl bg-gradient-to-br from-primary/10 via-blue-500/10 to-purple-500/10 border"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Transform Your Lead Management?
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-lg">
            Join hundreds of businesses who've already made the switch. 
            Start your free trial today - no credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 px-8">
                <Sparkles className="h-4 w-4" />
                Start Free Trial
              </Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="outline" className="gap-2 px-8">
                Learn More
              </Button>
            </Link>
          </div>
        </motion.section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} LeadAni LFS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

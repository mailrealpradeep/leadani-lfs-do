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
  Flame,
  Brain,
  Gauge,
  Bookmark,
  ListChecks,
  CalendarCheck,
  MapPin,
  Workflow,
  ShieldAlert,
  Gem,
  BarChart,
  GitBranchPlus,
  Bot,
  CircleDot,
  Wand2,
  FormInput,
  FileCheck,
  MessageCircle,
  Megaphone,
  UserCheck,
  Activity,
  Blocks,
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
  isNew?: boolean;
}

const leadCaptureFeatures: Feature[] = [
  {
    id: "never-lose-lead",
    icon: Shield,
    title: "Never Lose a Single Lead",
    tagline: "Every lead is protected, everywhere",
    description: "I built duplicate detection into every single entry point - manual add, bulk import, webhook, or WhatsApp. Mobile numbers are normalized smartly (strips country codes, compares last 10 digits). When duplicates are found, your team can merge, skip, or update. No lead falls through the cracks.",
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
    description: "Incoming leads are automatically distributed across your team based on custom percentages (e.g., 40% to Priyanka, 30% to Monica, 30% to Santoshi). Weighted round-robin ensures perfect fairness over time. No manual assignment needed. Your managers can focus on coaching, not admin work.",
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
    title: "Smart Lead Routing via Webhooks",
    tagline: "Language, region, source - all handled",
    description: "Create powerful routing rules with AND/OR conditions. Route Telugu leads to Telugu-speaking team, Mumbai leads to Mumbai office, Facebook leads to social media specialists. Our multi-webhook system supports configurable match modes - create new leads, update existing ones, or both. You can even auto-change lead status when a match is found.",
    benefits: [
      "Route by language, region, or source automatically",
      "Multiple match modes: create, update, or both",
      "Auto-change lead status on webhook match",
      "Combine unlimited conditions with AND/OR logic"
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
    id: "whatsapp-integration",
    icon: MessageCircle,
    title: "WhatsApp Business Integration",
    tagline: "Leads from WhatsApp, automatically",
    description: "Connect your WhatsApp Business numbers directly to Leadani via Meta Embedded Signup. Incoming messages are automatically processed - new leads are created based on trigger rules, follow-up messages are added to existing lead history, and duplicates trigger transfer requests. Phone numbers are allocated to specific users and sheets. The system handles everything: pattern matching, field mapping, default values, and even auto-reset of lead status when old leads re-engage.",
    benefits: [
      "Auto-create leads from WhatsApp messages",
      "Follow-up messages added to lead history automatically",
      "Duplicate detection with automatic transfer requests",
      "Configurable trigger rules and field mapping"
    ],
    sectors: [
      { name: "Real Estate", icon: Home, useCase: "Capture property inquiries from WhatsApp ads" },
      { name: "Education", icon: GraduationCap, useCase: "Convert WhatsApp admission queries into leads" },
      { name: "D2C Brands", icon: Briefcase, useCase: "Manage customer orders via WhatsApp" },
    ],
    gradient: "from-green-500 to-emerald-600",
    iconBg: "bg-green-500/10",
    isNew: true,
  },
  {
    id: "bulk-import",
    icon: Upload,
    title: "Bulk Import from Excel",
    tagline: "Thousands of leads in seconds",
    description: "Upload Excel or CSV files with smart column auto-mapping. Preview before import, review duplicates separately, merge or skip. Handles thousands of leads without slowdown. Full validation ensures clean data every time.",
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
    id: "add-lead-form",
    icon: FormInput,
    title: "Configurable Add Lead Form",
    tagline: "Only the fields your team needs",
    description: "Company Admins can fully configure the 'Add Lead' form - choose which fields appear, reorder them, mark fields as required or optional. This means your team sees a clean, focused form instead of overwhelming them with 30+ fields. Different teams can have different workflows, all from one system.",
    benefits: [
      "Choose which fields appear on the form",
      "Drag-and-drop field reordering",
      "Mark fields as required or optional",
      "Reduces data entry errors"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Streamline lead entry for faster data capture" },
      { name: "Healthcare", icon: Stethoscope, useCase: "Capture only essential patient information" },
      { name: "Education", icon: GraduationCap, useCase: "Customize admission inquiry forms" },
    ],
    gradient: "from-sky-500 to-blue-600",
    iconBg: "bg-sky-500/10",
    isNew: true,
  },
];

const teamPerformanceFeatures: Feature[] = [
  {
    id: "powerscore",
    icon: Gem,
    title: "PowerScore - Gamified Performance",
    tagline: "Turn work into a game your team wants to win",
    description: "I created PowerScore because traditional targets feel like pressure. PowerScore makes performance feel like a game. Configurable scoring rules award points for follow-ups, site visits, conversions, and more. Login streaks reward consistency. Milestone bonuses celebrate achievements. Admins approve or void transactions with full audit trails. The leaderboard drives healthy competition naturally.",
    benefits: [
      "Configurable scoring rules for any action",
      "Login streaks and milestone bonuses",
      "Admin approval workflow with void capability",
      "Full transaction audit trail"
    ],
    sectors: [
      { name: "Sales Teams", icon: TrendingUp, useCase: "Gamify the sales process with point-based rewards" },
      { name: "Call Centers", icon: Phone, useCase: "Incentivize call quality and quantity" },
      { name: "Education", icon: GraduationCap, useCase: "Track counselor performance with fun metrics" },
    ],
    gradient: "from-purple-500 to-pink-600",
    iconBg: "bg-purple-500/10",
    isNew: true,
  },
  {
    id: "leaderboard",
    icon: Trophy,
    title: "Live Performance Leaderboard",
    tagline: "See who's winning, right now",
    description: "Beautiful animated leaderboard showing top performers based on working targets and PowerScore. Daily, weekly, monthly views with podium display for top 3. Multi-sheet user exclusion ensures fair rankings. Each team member gets a unique icon. Celebrate achievements and drive healthy competition.",
    benefits: [
      "Real-time rankings across periods",
      "Animated podium for top 3 performers",
      "Multi-sheet user exclusion for fairness",
      "Drives healthy competition naturally"
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
    title: "Multi-Goal Target Management",
    tagline: "Set goals, track progress, celebrate wins",
    description: "Three powerful target types: Fixed targets (hit exact numbers), Single Column Compliance (follow-up on time), and Compare Columns (track conversions). Assign to individuals, teams, or everyone. Flexible time periods - daily, weekly, monthly. Real-time progress tracking with beautiful visualizations that your team actually wants to check.",
    benefits: [
      "Three target types for maximum flexibility",
      "Individual or team assignments",
      "Real-time progress tracking",
      "Flexible time period configuration"
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
    id: "vision-board",
    icon: Star,
    title: "Vision Board - Dream & Achieve",
    tagline: "See your dreams, track your earnings",
    description: "This is the feature I'm most proud of. Every executive has dreams - a new car, a house, that vacation. Vision Board connects those dreams to daily work. Set money-based goals, upload dream images, and watch a beautiful animated progress ring fill as you close deals. Earnings track closings + incentives, with effort metrics breaking down Sales, Visits, New Leads, and Follow-ups across daily/weekly/monthly/yearly periods. Admins can set company-wide targets and per-user configurations. Multiple currencies supported.",
    benefits: [
      "Personal dream images and money goals",
      "Animated progress ring with real-time tracking",
      "Admin-controlled company-wide and per-user targets",
      "Auto-calculated effort metrics across all periods"
    ],
    sectors: [
      { name: "Sales Teams", icon: TrendingUp, useCase: "Connect daily effort to personal dreams" },
      { name: "Real Estate", icon: Home, useCase: "Track commission earnings toward goals" },
      { name: "Insurance", icon: Briefcase, useCase: "Visualize policy targets against aspirations" },
    ],
    gradient: "from-amber-400 to-orange-500",
    iconBg: "bg-amber-400/10",
    isNew: true,
  },
  {
    id: "attendance",
    icon: UserCheck,
    title: "Mobile Attendance System",
    tagline: "Punch in, punch out, stay accountable",
    description: "A mobile-first PWA attendance system for daily entry/exit tracking. Your team marks attendance from their phones - no biometric hardware needed. Combined with exit rules, you can ensure team members complete required work before marking their day as done. Force exit requires admin approval with a reason.",
    benefits: [
      "Mobile-first - works on any phone",
      "No hardware or biometric devices needed",
      "Configurable exit rules per team",
      "Force exit with admin approval"
    ],
    sectors: [
      { name: "Field Sales", icon: Car, useCase: "Track field team attendance remotely" },
      { name: "Call Centers", icon: Phone, useCase: "Shift management without hardware" },
      { name: "Remote Teams", icon: Globe, useCase: "Distributed team attendance tracking" },
    ],
    gradient: "from-teal-500 to-cyan-600",
    iconBg: "bg-teal-500/10",
  },
  {
    id: "exit-rules",
    icon: ClipboardCheck,
    title: "Exit Rules - Ensure Work Completion",
    tagline: "No shortcuts before day ends",
    description: "Configurable exit rules ensure team members complete required work before marking attendance exit. Set minimum leads updated, calls made, or follow-ups scheduled. This simple feature has transformed team discipline for our customers. No more half-done days.",
    benefits: [
      "Ensure daily work completion",
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
    id: "followup-transactions",
    icon: Activity,
    title: "Follow-up Transaction Tracking",
    tagline: "Every follow-up, accounted for",
    description: "Admin-only page showing all follow-up events with user, sheet, and date filters with pagination. Built on a unified followup_events table with a sliding 60-second deduplication window - so rapid updates don't create duplicate PowerScore awards. Complete transparency into who followed up, when, and how often.",
    benefits: [
      "Complete follow-up activity log",
      "60-second deduplication prevents double-counting",
      "Filter by user, sheet, or date range",
      "Powers accurate PowerScore calculations"
    ],
    sectors: [
      { name: "Sales Management", icon: Users, useCase: "Verify team follow-up discipline" },
      { name: "Compliance", icon: ShieldCheck, useCase: "Audit trail for all client interactions" },
    ],
    gradient: "from-slate-500 to-gray-600",
    iconBg: "bg-slate-500/10",
    isNew: true,
  },
];

const aiFeatures: Feature[] = [
  {
    id: "ai-lead-rating",
    icon: Brain,
    title: "AI-Powered Lead Rating",
    tagline: "AI reads between the lines of every follow-up",
    description: "This feature uses AI to analyze all your follow-up remarks - in English, Hindi, or Odia - and calculates engagement, sentiment, and progression scores. After 3+ follow-ups, leads are automatically rated from Hot to Poor on a 5-star scale. The AI Insights column appears right in your spreadsheet grid with dropdown filtering. No button to click - ratings happen automatically in the background whenever a new follow-up is added.",
    benefits: [
      "Automatic rating after 3+ follow-ups",
      "Multi-language support (English, Hindi, Odia)",
      "Engagement, sentiment, and progression scoring",
      "Real-time updates via live sync"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Focus on highest-potential leads automatically" },
      { name: "Education", icon: GraduationCap, useCase: "Identify students most likely to enroll" },
      { name: "Real Estate", icon: Home, useCase: "Prioritize buyers showing genuine interest" },
    ],
    gradient: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-500/10",
    isNew: true,
  },
  {
    id: "quality-check",
    icon: FileCheck,
    title: "AI Quality Check for Remarks",
    tagline: "No more lazy 'called, no answer' remarks",
    description: "This was a game-changer for our customers. AI validates every follow-up remark before it's saved. If someone types 'called' or 'NP' without real substance, the AI flags it and asks for more detail. Configurable acceptance levels from strict to lenient. Multi-language support means it works in Hindi, English, or Odia. Uses a fail-open strategy - if the AI service is down, work continues uninterrupted.",
    benefits: [
      "AI validates remark quality before saving",
      "Configurable strictness levels",
      "Multi-language validation (Hindi, English, Odia)",
      "Fail-open strategy - never blocks work"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Ensure meaningful customer interaction notes" },
      { name: "Healthcare", icon: Stethoscope, useCase: "Quality patient interaction documentation" },
      { name: "Collections", icon: Clock, useCase: "Proper documentation of every contact attempt" },
    ],
    gradient: "from-emerald-500 to-green-600",
    iconBg: "bg-emerald-500/10",
    isNew: true,
  },
  {
    id: "insta-support",
    icon: Bot,
    title: "Insta Support - AI Assistant",
    tagline: "Instant answers about any feature",
    description: "Your team doesn't need to read manuals. Insta Support is an AI-powered assistant built right into the app that answers questions about any feature. It classifies questions, extracts entities, respects role-based access, redacts PII, and supports multiple languages. It's like having a 24/7 support agent who knows every feature inside out.",
    benefits: [
      "Instant answers about any app feature",
      "Role-based access control - shows only what users can see",
      "PII redaction for security",
      "Multi-language support"
    ],
    sectors: [
      { name: "All Industries", icon: Building2, useCase: "Zero training time for new team members" },
      { name: "Large Teams", icon: Users, useCase: "Reduce support tickets from internal users" },
    ],
    gradient: "from-blue-500 to-cyan-600",
    iconBg: "bg-blue-500/10",
    isNew: true,
  },
];

const automationFeatures: Feature[] = [
  {
    id: "auto-fill-rules",
    icon: Wand2,
    title: "Auto-Fill Rules",
    tagline: "Fields fill themselves based on your logic",
    description: "Set up rules that automatically populate fields when trigger conditions are met. Change lead status to 'Site Visit Done'? The visit date auto-fills with today. Mark a lead as 'Converted'? The conversion date fills automatically. Priority ordering and enable/disable toggles give you full control. Rules respect Final Value protections - they won't overwrite protected fields.",
    benefits: [
      "Auto-populate fields based on triggers",
      "Priority ordering for multiple rules",
      "Enable/disable toggles per rule",
      "Respects Final Value protections"
    ],
    sectors: [
      { name: "Real Estate", icon: Home, useCase: "Auto-fill visit dates when status changes" },
      { name: "Sales", icon: TrendingUp, useCase: "Auto-set conversion dates and values" },
      { name: "Insurance", icon: Briefcase, useCase: "Auto-populate policy dates on approval" },
    ],
    gradient: "from-amber-500 to-yellow-600",
    iconBg: "bg-amber-500/10",
    isNew: true,
  },
  {
    id: "validation-rules",
    icon: ListChecks,
    title: "Validation Rules",
    tagline: "Prompt users to fill related fields",
    description: "When a team member changes a lead's status, validation rules can prompt them to update related fields. For example: 'You changed status to Site Visit Done - please update the visit date.' Server-side enforcement ensures nobody skips required information. This keeps your data complete and reliable.",
    benefits: [
      "Automatic prompts for related field updates",
      "Server-side enforcement - can't be bypassed",
      "Configurable per column and value",
      "Keeps data complete and consistent"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Ensure all deal details are captured" },
      { name: "Healthcare", icon: Stethoscope, useCase: "Complete patient records at every step" },
      { name: "Education", icon: GraduationCap, useCase: "Full admission details when status changes" },
    ],
    gradient: "from-orange-500 to-red-600",
    iconBg: "bg-orange-500/10",
    isNew: true,
  },
  {
    id: "final-value-settings",
    icon: ShieldAlert,
    title: "Final Value Protection",
    tagline: "Some values should never go backward",
    description: "Once a lead reaches 'Converted', it shouldn't accidentally go back to 'Interested'. Final Value Settings lock critical column values from being changed backward. Admin override is available when genuinely needed. The 'Block Webhooks & Automations' toggle extends this protection to automated systems - webhooks, WhatsApp messages, and auto-fill rules can't override final values either. Your pipeline integrity stays intact.",
    benefits: [
      "Prevent accidental status reversals",
      "Block webhooks and automations from changing final values",
      "Admin override for genuine corrections",
      "Frontend and backend enforcement"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Protect conversion status from accidental changes" },
      { name: "Insurance", icon: Briefcase, useCase: "Lock policy status after issuance" },
      { name: "Education", icon: GraduationCap, useCase: "Protect enrollment confirmations" },
    ],
    gradient: "from-red-500 to-rose-600",
    iconBg: "bg-red-500/10",
    isNew: true,
  },
  {
    id: "conversion-settings",
    icon: GitBranchPlus,
    title: "Conversion Settings - Pipeline Config",
    tagline: "Your complete sales pipeline, visualized",
    description: "A centralized hub for managing your entire sales pipeline. Configure up to 8 stages with trigger mapping to lead status, visit status, or combined conditions. Set conversion values (fixed, from lead field, or manual), configure incentive structures (percentage, fixed, tiered), and manage approval workflows. Visual pipeline overview shows stage metrics with expected vs actual conversion rate tracking.",
    benefits: [
      "Up to 8 configurable pipeline stages",
      "Multiple trigger types (status, visit, combined)",
      "Flexible incentive structures",
      "Expected vs actual conversion tracking"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Full pipeline visibility from lead to close" },
      { name: "Real Estate", icon: Home, useCase: "Track inquiry to booking conversion" },
      { name: "Education", icon: GraduationCap, useCase: "Admission funnel from inquiry to enrollment" },
    ],
    gradient: "from-blue-600 to-indigo-700",
    iconBg: "bg-blue-600/10",
    isNew: true,
  },
  {
    id: "powerflow",
    icon: BarChart,
    title: "PowerFlow - Pipeline Analytics",
    tagline: "See exactly where leads drop off",
    description: "Visual funnel analytics showing how leads progress through your configured pipeline stages. See conversion rates at each stage, identify where leads drop off, and use backward simulation to understand your pipeline. Period-based filtering lets you compare performance across time. Sheet-level access control and multi-sheet user exclusion keep the data meaningful.",
    benefits: [
      "Visual funnel with conversion rates",
      "Identify drop-off points instantly",
      "Backward simulation for pipeline analysis",
      "Period-based filtering and comparison"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Optimize conversion at every stage" },
      { name: "Marketing", icon: Megaphone, useCase: "Measure campaign effectiveness through the funnel" },
      { name: "Education", icon: GraduationCap, useCase: "Track admission funnel leakage" },
    ],
    gradient: "from-cyan-500 to-blue-600",
    iconBg: "bg-cyan-500/10",
    isNew: true,
  },
];

const dailyWorkFeatures: Feature[] = [
  {
    id: "excel-interface",
    icon: LayoutGrid,
    title: "Familiar Excel-Like Interface",
    tagline: "Zero learning curve for your team",
    description: "Your team already knows Excel. Leadani feels the same - click to edit, tab to move, copy-paste works. Full keyboard navigation for power users. But unlike Excel, changes sync in real-time, data is secure, and you get powerful CRM features built right into the grid. This is the reason our customers' teams adopt Leadani within hours, not weeks.",
    benefits: [
      "Instant familiarity for any team",
      "No training needed",
      "Full keyboard navigation",
      "Copy-paste works naturally"
    ],
    sectors: [
      { name: "All Industries", icon: Building2, useCase: "Universal spreadsheet familiarity" },
    ],
    gradient: "from-green-600 to-teal-600",
    iconBg: "bg-green-600/10",
  },
  {
    id: "visual-highlighting",
    icon: Palette,
    title: "Conditional Row Highlighting",
    tagline: "12 colors, unlimited rules",
    description: "Create automatic highlighting rules that make important leads pop. Red for urgent, yellow for warm, green for converted. Combine multiple conditions - 'Status is Hot AND Follow-up is Overdue'. Rules can apply per-sheet or globally. Your team instantly sees what needs attention without reading a single field.",
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
    id: "nfdt",
    icon: Calendar,
    title: "Follow-up Tracking (NFDT)",
    tagline: "Never miss a follow-up again",
    description: "The Next Follow-up Date Time field is the heartbeat of your team's daily work. Automatic highlighting for overdue items. Dashboard shows who's behind on follow-ups. Compliance tracking ensures no lead goes cold. Your managers see the full picture at a glance.",
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
    id: "custom-views",
    icon: Filter,
    title: "Custom Views",
    tagline: "Saved filters as sidebar menu items",
    description: "Create sidebar menu items that display filtered leads based on configurable group-based conditions. Choose custom icons, add optional badge counts showing how many leads match, and assign views to sidebar sections. Your team gets quick access to the exact lead lists they work with daily - 'Today's Follow-ups', 'Overdue Leads', 'High Value Pending' - all one click away.",
    benefits: [
      "Saved filter views in sidebar",
      "Custom icons and badge counts",
      "Group-based filter conditions",
      "Can appear in Custom Views or Data Mismatch sections"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Quick access to hot leads, today's follow-ups" },
      { name: "Support", icon: HeartHandshake, useCase: "One-click view of pending tickets" },
      { name: "Management", icon: Users, useCase: "Custom views for different review scenarios" },
    ],
    gradient: "from-indigo-500 to-purple-600",
    iconBg: "bg-indigo-500/10",
    isNew: true,
  },
  {
    id: "user-row-filters",
    icon: Filter,
    title: "Persistent Row Filters",
    tagline: "Your filters, saved and ready",
    description: "Create and save personal row filters with multiple conditions. Your filters persist across sessions - come back tomorrow and your filtered view is exactly how you left it. No more re-applying the same 5 filters every morning.",
    benefits: [
      "Save personal filter combinations",
      "Persist across sessions automatically",
      "Multiple conditions per filter",
      "Each user has their own filters"
    ],
    sectors: [
      { name: "All Industries", icon: Building2, useCase: "Personalized data views for every team member" },
    ],
    gradient: "from-sky-500 to-blue-600",
    iconBg: "bg-sky-500/10",
  },
  {
    id: "hot-leads",
    icon: Flame,
    title: "Hot Leads Dashboard",
    tagline: "Priority leads, one powerful view",
    description: "Automatically identify high-priority leads based on configurable conditions - visit status, lead status, custom markers, or any column. View all hot leads across all sheets in one unified spreadsheet grid with full inline editing, sorting, filtering, and real-time updates. Never miss a high-value opportunity.",
    benefits: [
      "Unified view across all sheets",
      "Full spreadsheet grid with inline editing",
      "Configurable AND/OR conditions",
      "Real-time updates"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Focus on high-conversion leads instantly" },
      { name: "Real Estate", icon: Home, useCase: "Track site visit-ready prospects" },
      { name: "Education", icon: GraduationCap, useCase: "Prioritize ready-to-enroll students" },
    ],
    gradient: "from-orange-500 to-red-600",
    iconBg: "bg-orange-500/10",
  },
  {
    id: "watchlist",
    icon: Bookmark,
    title: "Personal Watchlist",
    tagline: "Keep an eye on the leads that matter most",
    description: "Bookmark any lead to your personal watchlist. Get a dedicated view of just the leads you're tracking closely - key deals, VIP clients, or leads at critical stages. Real-time updates ensure your watchlist always reflects the latest status.",
    benefits: [
      "Personal lead bookmarking",
      "Dedicated watchlist view",
      "Real-time status updates",
      "Quick access to important leads"
    ],
    sectors: [
      { name: "Sales", icon: TrendingUp, useCase: "Track key deals through the pipeline" },
      { name: "Account Management", icon: Users2, useCase: "Monitor VIP client accounts" },
    ],
    gradient: "from-pink-500 to-rose-600",
    iconBg: "bg-pink-500/10",
    isNew: true,
  },
  {
    id: "visit-schedules",
    icon: CalendarCheck,
    title: "Visit Schedules & Calendar",
    tagline: "Plan and track every site visit",
    description: "Calendar-based views for tracking scheduled and completed site visits. Your field team can see their upcoming visits, and managers can track who visited where and when. Customizable card displays show the information that matters for each visit.",
    benefits: [
      "Calendar view of all scheduled visits",
      "Track completed vs planned visits",
      "Customizable visit cards",
      "Manager oversight of field activity"
    ],
    sectors: [
      { name: "Real Estate", icon: Home, useCase: "Coordinate property showings and site visits" },
      { name: "Field Sales", icon: Car, useCase: "Plan and track client meetings" },
      { name: "Healthcare", icon: Stethoscope, useCase: "Schedule and track patient visits" },
    ],
    gradient: "from-teal-500 to-emerald-600",
    iconBg: "bg-teal-500/10",
    isNew: true,
  },
  {
    id: "lead-thoughts",
    icon: CircleDot,
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
    description: "Progressive Web App works like a native app without app store download. Full lead management on mobile - view, edit, filter, sort. Configurable mobile cards show only the fields you need. Push notifications keep you updated on every change that matters.",
    benefits: [
      "No app store, instant access",
      "Full functionality on mobile",
      "Configurable mobile lead cards",
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
];

const customizationFeatures: Feature[] = [
  {
    id: "custom-columns",
    icon: Layers,
    title: "Fully Customizable Fields",
    tagline: "Your data, your structure",
    description: "Add any column type - text, number, date, dropdown, multi-select. Dynamic dropdowns that change based on other field values. Validation rules ensure data quality. Reorder and resize columns freely. Your CRM adapts to your business, not the other way around.",
    benefits: [
      "Any field type you need",
      "Dynamic conditional dropdowns",
      "Data validation rules",
      "Full layout control"
    ],
    sectors: [
      { name: "Custom Workflows", icon: Settings, useCase: "Build exactly what you need" },
      { name: "Industry-specific", icon: Building2, useCase: "Add specialized fields for your domain" },
    ],
    gradient: "from-fuchsia-500 to-pink-600",
    iconBg: "bg-fuchsia-500/10",
  },
  {
    id: "timezone",
    icon: Globe,
    title: "Company Timezone Support",
    tagline: "Time makes sense, everywhere",
    description: "All timestamps displayed in your company's timezone. Webhook timestamps automatically converted. No confusion for distributed teams. 100+ timezones supported.",
    benefits: [
      "Consistent time display",
      "Automatic conversion from webhooks",
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

const dataSafetyFeatures: Feature[] = [
  {
    id: "soft-delete",
    icon: Trash2,
    title: "30-Day Lead Recovery",
    tagline: "Accidents happen, data survives",
    description: "Deleted leads aren't gone forever. They move to a recovery zone for 30 days. Restore with one click. Permanent deletion only after 30 days, and even then with confirmation. Because I know accidents happen - and losing data shouldn't be one of them.",
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
    tagline: "Your data, always accessible outside Leadani",
    description: "Automatic hourly backup to your Google Sheets. Your data is always accessible even outside Leadani. Full lead data including all custom columns and update history. You own your data completely - no vendor lock-in, ever.",
    benefits: [
      "Hourly automatic backups",
      "Data always accessible outside the system",
      "Full ownership of your data",
      "No vendor lock-in"
    ],
    sectors: [
      { name: "All Industries", icon: Database, useCase: "Universal data safety and portability" },
    ],
    gradient: "from-blue-400 to-green-500",
    iconBg: "bg-blue-400/10",
  },
  {
    id: "snapshots",
    icon: History,
    title: "Point-in-Time Recovery",
    tagline: "Go back to any hour in the last 30 days",
    description: "Automatic hourly snapshots of your entire sheet with 30-day retention. Made a mistake? Restore your sheet to exactly how it was at any hour in the past month. Preview changes before restoring - see exactly what will be affected. This is your safety net.",
    benefits: [
      "Hourly automatic snapshots",
      "30-day retention",
      "Preview before restore",
      "Full sheet recovery"
    ],
    sectors: [
      { name: "Enterprise", icon: Building2, useCase: "Critical data protection" },
      { name: "Compliance", icon: ShieldCheck, useCase: "Audit and recovery capabilities" },
    ],
    gradient: "from-indigo-400 to-purple-500",
    iconBg: "bg-indigo-400/10",
  },
  {
    id: "audit-trail",
    icon: Eye,
    title: "Complete Audit Trail",
    tagline: "Every action is recorded forever",
    description: "Full audit trail of who did what, when. Every lead update, every login, every change. Chronological history per lead shows the complete journey from creation to conversion. When disputes arise, the data speaks for itself.",
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
    id: "data-management",
    icon: Database,
    title: "Data Management Console",
    tagline: "Admin tools for bulk operations",
    description: "Company Admin tools for bulk operations like data clearing and lead transfers between team members. When someone leaves your team or switches roles, transfer all their leads in one go. Clean up test data, merge sheets, or reorganize your entire lead structure without touching individual records.",
    benefits: [
      "Bulk lead transfers between users",
      "Data clearing for clean starts",
      "No individual record manipulation needed",
      "Admin-only access for safety"
    ],
    sectors: [
      { name: "Growing Teams", icon: Users, useCase: "Handle team changes seamlessly" },
      { name: "Enterprise", icon: Building2, useCase: "Large-scale data reorganization" },
    ],
    gradient: "from-gray-500 to-slate-600",
    iconBg: "bg-gray-500/10",
    isNew: true,
  },
];

const reportsFeatures: Feature[] = [
  {
    id: "reports",
    icon: BarChart3,
    title: "Powerful Reports & Analytics",
    tagline: "Insights that drive decisions",
    description: "Custom report builder with drill-down capability. Team performance comparisons side by side. Time period analysis - this week vs last, this month vs target. Export reports to Excel for presentations or further analysis.",
    benefits: [
      "Custom report builder",
      "Drill-down to individual details",
      "Time period comparisons",
      "Excel export for sharing"
    ],
    sectors: [
      { name: "Management", icon: Users, useCase: "Strategic decision making" },
      { name: "Operations", icon: Settings, useCase: "Process optimization" },
    ],
    gradient: "from-teal-500 to-cyan-600",
    iconBg: "bg-teal-500/10",
  },
];

const adminFeatures: Feature[] = [
  {
    id: "rbac",
    icon: Lock,
    title: "Three-Tier Role-Based Access",
    tagline: "Right people, right access, right data",
    description: "Three-tier access control: Super Admin manages multiple companies, Company Admin has full company control, Users access only assigned sheets. Sheet-level permissions control who sees what. Password-protected sheet deletion. Audit logs track all access. Your data is always in the right hands.",
    benefits: [
      "Three-tier hierarchy",
      "Sheet-level permissions",
      "Password-protected destructive actions",
      "Complete access audit logging"
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
    title: "Easy Self-Service Onboarding",
    tagline: "New company? Set up in minutes",
    description: "Multi-step self-service signup flow for new companies. Invite team members with one click - they get an email with a setup link. Role assignment during invitation. No IT support needed. We've seen companies go from signup to fully operational in under 30 minutes.",
    benefits: [
      "Guided multi-step signup wizard",
      "One-click team invitations",
      "Role pre-assignment during invite",
      "Zero IT overhead"
    ],
    sectors: [
      { name: "Startups", icon: Sparkles, useCase: "Quick team scaling from day one" },
      { name: "SMBs", icon: Building2, useCase: "No IT department needed" },
    ],
    gradient: "from-emerald-400 to-green-500",
    iconBg: "bg-emerald-400/10",
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg">{feature.title}</h3>
                      {feature.isNew && (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
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
  const totalFeatures = leadCaptureFeatures.length + teamPerformanceFeatures.length + aiFeatures.length + automationFeatures.length + dailyWorkFeatures.length + customizationFeatures.length + dataSafetyFeatures.length + reportsFeatures.length + adminFeatures.length;
  
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
            <Badge className="mb-6 px-4 py-1.5 text-sm" variant="secondary" data-testid="badge-hero">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {totalFeatures}+ Features, One Platform
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold tracking-tight"
            data-testid="text-hero-heading"
          >
            Everything Your Team Needs
            <span className="block mt-2 bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent">
              to Close More Deals
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
            data-testid="text-hero-description"
          >
            I built Leadani because I saw teams struggling with clunky CRMs, lost leads, and zero accountability. 
            Every feature here was born from a real problem faced by a real team. This is not a feature list - it's a promise.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/signup" data-testid="link-hero-signup">
              <Button size="lg" className="gap-2 px-8" data-testid="button-hero-trial">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login" data-testid="link-hero-signin">
              <Button size="lg" variant="outline" className="gap-2 px-8" data-testid="button-hero-signin">
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
              { value: "50K+", label: "Leads Managed", id: "leads" },
              { value: "500+", label: "Happy Users", id: "users" },
              { value: "99.9%", label: "Uptime", id: "uptime" },
              { value: `${totalFeatures}+`, label: "Features", id: "features" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="text-center"
                data-testid={`stat-${stat.id}`}
              >
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent" data-testid={`text-stat-value-${stat.id}`}>
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1" data-testid={`text-stat-label-${stat.id}`}>{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FounderNote() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="py-16"
    >
      <div className="max-w-3xl mx-auto">
        <Card className="overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-blue-600">
                <HeartHandshake className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">A Note from the Founder</h3>
                <p className="text-sm text-muted-foreground">Why I built Leadani</p>
              </div>
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                I started building Leadani after watching sales teams struggle with tools that were either too simple to be useful or too complex to adopt. Excel was familiar but had no accountability. Enterprise CRMs had features but required months of training and huge budgets.
              </p>
              <p>
                My approach was different: <span className="font-medium text-foreground">make it feel like Excel, but give it the power of a full CRM</span>. Your team shouldn't need training to use their own tool. Every feature you see on this page was built because a real customer said "I wish I could..." - and we made it happen.
              </p>
              <p>
                From AI-powered lead rating to WhatsApp integration, from gamified leaderboards to point-in-time data recovery - every feature is designed to make your team more productive, more accountable, and more successful.
              </p>
              <p className="font-medium text-foreground">
                Leadani is not just software. It's the tool I wish I had when I was managing a team myself.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.section>
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
  let runningIndex = 0;
  const getStartIndex = (count: number) => {
    const start = runningIndex;
    runningIndex += count;
    return start;
  };

  return (
    <div className="min-h-screen bg-background" data-testid="features-page">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" data-testid="link-home-logo">
            <motion.div 
              className="flex items-center gap-2 cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-blue-600">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">Leadani LFS</span>
            </motion.div>
          </Link>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" data-testid="link-header-signin">
              <Button variant="ghost" size="sm" data-testid="button-header-signin">Sign In</Button>
            </Link>
            <Link href="/signup" data-testid="link-header-signup">
              <Button size="sm" data-testid="button-header-signup">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <HeroSection />

      <main className="container mx-auto px-4 pb-20">
        <FounderNote />

        <CategorySection
          title="Lead Capture & Protection"
          subtitle="Every lead captured, every lead protected. From WhatsApp to webhooks, nothing falls through the cracks."
          icon={Shield}
          features={leadCaptureFeatures}
          gradient="from-emerald-500 to-teal-600"
          startIndex={getStartIndex(leadCaptureFeatures.length)}
        />

        <CategorySection
          title="Team Performance & Gamification"
          subtitle="Build accountability, celebrate wins, and drive healthy competition with powerful performance tools."
          icon={Trophy}
          features={teamPerformanceFeatures}
          gradient="from-amber-500 to-orange-600"
          startIndex={getStartIndex(teamPerformanceFeatures.length)}
        />

        <CategorySection
          title="AI-Powered Intelligence"
          subtitle="Let artificial intelligence handle the analysis, quality checks, and support - so your team can focus on selling."
          icon={Brain}
          features={aiFeatures}
          gradient="from-violet-500 to-purple-600"
          startIndex={getStartIndex(aiFeatures.length)}
        />

        <CategorySection
          title="Automation & Pipeline Management"
          subtitle="Rules that enforce themselves, pipelines that track themselves, and protections that work 24/7."
          icon={Workflow}
          features={automationFeatures}
          gradient="from-blue-500 to-indigo-600"
          startIndex={getStartIndex(automationFeatures.length)}
        />

        <CategorySection
          title="Daily Work & Collaboration"
          subtitle="The tools your team uses every single day - built for speed, clarity, and real-time collaboration."
          icon={Zap}
          features={dailyWorkFeatures}
          gradient="from-cyan-500 to-teal-600"
          startIndex={getStartIndex(dailyWorkFeatures.length)}
        />

        <CategorySection
          title="Customization & Flexibility"
          subtitle="Your business is unique. Your CRM should adapt to you, not the other way around."
          icon={Settings}
          features={customizationFeatures}
          gradient="from-purple-500 to-pink-600"
          startIndex={getStartIndex(customizationFeatures.length)}
        />

        <CategorySection
          title="Data Safety & Recovery"
          subtitle="Your data is precious. Multiple layers of protection ensure it's always safe and always recoverable."
          icon={ShieldCheck}
          features={dataSafetyFeatures}
          gradient="from-slate-500 to-gray-600"
          startIndex={getStartIndex(dataSafetyFeatures.length)}
        />

        <CategorySection
          title="Reports & Analytics"
          subtitle="Turn your data into actionable intelligence that drives better decisions."
          icon={BarChart3}
          features={reportsFeatures}
          gradient="from-teal-500 to-cyan-600"
          startIndex={getStartIndex(reportsFeatures.length)}
        />

        <CategorySection
          title="Administration & Access Control"
          subtitle="Enterprise-grade security with consumer-grade simplicity."
          icon={Lock}
          features={adminFeatures}
          gradient="from-gray-500 to-slate-600"
          startIndex={getStartIndex(adminFeatures.length)}
        />

        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center py-16 px-8 rounded-3xl bg-gradient-to-br from-primary/10 via-blue-500/10 to-purple-500/10 border"
          data-testid="section-cta"
        >
          <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-cta-heading">
            Ready to Transform Your Lead Management?
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-lg" data-testid="text-cta-description">
            Join hundreds of businesses who've already made the switch. 
            Start your free trial today - no credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" data-testid="link-cta-signup">
              <Button size="lg" className="gap-2 px-8" data-testid="button-cta-trial">
                <Sparkles className="h-4 w-4" />
                Start Free Trial
              </Button>
            </Link>
            <Link href="/" data-testid="link-cta-home">
              <Button size="lg" variant="outline" className="gap-2 px-8" data-testid="button-cta-learn">
                Learn More
              </Button>
            </Link>
          </div>
        </motion.section>
      </main>

      <footer className="border-t py-8" data-testid="footer">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p data-testid="text-copyright">&copy; {new Date().getFullYear()} Leadani LFS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
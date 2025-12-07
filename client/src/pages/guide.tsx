import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ChevronLeft,
  Building2,
  Users,
  FileSpreadsheet,
  Upload,
  Download,
  Webhook,
  Target,
  Clock,
  Palette,
  Filter,
  Database,
  Smartphone,
  BarChart3,
  Copy,
  Settings,
  Shield,
  Cloud,
  ArrowRight,
  CheckCircle2,
  Zap,
  GitBranch,
  Percent,
  RefreshCw,
  Eye,
  Layers,
  UserCheck,
  Bell,
  HelpCircle,
} from "lucide-react";

interface GuideStep {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
}

interface GuideSection {
  id: string;
  name: string;
  icon: any;
  description: string;
  badge?: string;
  items: GuideStep[];
}

const guideData: GuideSection[] = [
  {
    id: "setup",
    name: "Setting Up Your Business",
    icon: Building2,
    description: "Initial company setup and configuration",
    items: [
      {
        title: "Company Registration",
        description: "Get your company set up on Leadani",
        steps: [
          "Go to the signup page and enter your company details",
          "Create your admin account with email and password",
          "Verify your email address",
          "You're now the Company Admin with full access"
        ]
      },
      {
        title: "Configure Company Timezone",
        description: "Set your timezone so all dates/times display correctly",
        steps: [
          "Go to Admin Console → General Settings",
          "Find the Timezone setting",
          "Select your timezone (e.g., Asia/Kolkata)",
          "Save - all dates across the system will now use this timezone"
        ],
        tips: ["Timezone affects webhooks, activity logs, targets, attendance, and all date displays"]
      }
    ]
  },
  {
    id: "team",
    name: "Building Your Team",
    icon: Users,
    description: "Invite users, assign roles, and manage access",
    items: [
      {
        title: "Invite Team Members",
        description: "Add your sales team and other users",
        steps: [
          "Go to Admin Console → Users",
          "Click 'Invite User'",
          "Enter their email address",
          "Select role: Admin (full access) or User (limited access)",
          "Click Send Invite",
          "User receives email to set up their account"
        ]
      },
      {
        title: "Understanding Roles",
        description: "Three levels of access control",
        steps: [
          "Super Admin: Platform-level, manages all companies (Leadani team only)",
          "Company Admin: Full access to your company - settings, users, all sheets, webhooks",
          "User: Access only to assigned sheets, can manage leads within those sheets"
        ]
      },
      {
        title: "Assign Sheet Access",
        description: "Control which sheets each user can see",
        steps: [
          "Go to Admin Console → Users",
          "Find the user and click 'Manage Sheet Access'",
          "Click 'Add Sheet' and select sheets they should access",
          "Remove sheets by clicking the X next to them",
          "Users only see leads in their assigned sheets"
        ],
        tips: ["Admins can see all sheets automatically"]
      },
      {
        title: "Delete Users Safely",
        description: "Remove users while preserving history",
        steps: [
          "Go to Admin Console → Users",
          "Find the user and click Delete",
          "Confirm the deletion",
          "All audit history is preserved (who created/updated leads)",
          "User's sheet access and filters are removed"
        ]
      }
    ]
  },
  {
    id: "sheets",
    name: "Organizing Your Leads",
    icon: FileSpreadsheet,
    description: "Create sheets, columns, and dropdown options",
    items: [
      {
        title: "Create Sheets",
        description: "Sheets are like Excel tabs - organize leads by team, source, or campaign",
        steps: [
          "Go to Admin Console → Sheets",
          "Click '+ Add Sheet'",
          "Enter a name (e.g., 'Facebook Leads', 'Sales Team A')",
          "Sheet is created with default columns: Full Name, Mobile No"
        ],
        tips: ["Create separate sheets for different teams or lead sources for better organization"]
      },
      {
        title: "Add Custom Columns",
        description: "Extend sheets with your own fields",
        steps: [
          "Go to Admin Console → Columns",
          "Select the sheet to modify",
          "Click 'Add Column'",
          "Enter column name and select type:",
          "- Text: Free-form text (names, notes)",
          "- Number: Numeric values",
          "- Date: Date picker",
          "- DateTime: Date and time picker",
          "- Dropdown: Predefined options",
          "- Checkbox: Yes/No toggle"
        ]
      },
      {
        title: "Mandatory Columns",
        description: "Full Name and Mobile No are protected",
        steps: [
          "Full Name and Mobile No exist on every sheet",
          "These columns cannot be deleted",
          "Mobile No is the unique identifier for duplicate detection",
          "Configure validation rules but cannot remove them"
        ]
      },
      {
        title: "Setup Dropdown Options",
        description: "Create predefined choices for dropdown columns",
        steps: [
          "Go to Admin Console → Dropdown Options",
          "Select the column (e.g., Status, Source, Course)",
          "Click 'Add Option'",
          "Enter the value (e.g., 'Hot Lead', 'Cold Lead')",
          "Optionally assign a color for visual distinction",
          "Options are immediately available in the sheet"
        ],
        tips: ["Use colors to quickly identify lead status at a glance"]
      }
    ]
  },
  {
    id: "leads-manual",
    name: "Managing Leads Manually",
    icon: Users,
    description: "Add, edit, search, and organize leads",
    items: [
      {
        title: "Add Lead Manually",
        description: "Enter a new lead directly",
        steps: [
          "Go to Dashboard and select your sheet",
          "Click '+ Add Lead' button",
          "Fill in Full Name and Mobile No (required)",
          "Fill in any custom fields",
          "Click Save",
          "If duplicate detected, choose Merge or Don't Add"
        ]
      },
      {
        title: "Edit Lead",
        description: "Update lead information",
        steps: [
          "Click on the lead row to open details panel",
          "Or double-click a cell to edit inline",
          "Make your changes",
          "Changes auto-save or click Save",
          "All changes are logged in Activity History"
        ]
      },
      {
        title: "Add Lead Updates",
        description: "Track conversations and follow-ups",
        steps: [
          "Open the lead details panel",
          "Find the 'Updates' or 'Activity' section",
          "Click 'Add Update'",
          "Enter your notes (call summary, next steps)",
          "Updates are timestamped with your name",
          "Full chronological history is maintained"
        ],
        tips: ["Regular updates help team members understand lead history"]
      },
      {
        title: "Lead Thought (Sure/May Be)",
        description: "Mark leads with conversion confidence",
        steps: [
          "Open lead details",
          "Find the 'Lead Thought' option",
          "Select 'Sure' (high confidence) or 'May Be' (uncertain)",
          "Leads are visually highlighted based on thought",
          "Use this to prioritize follow-ups"
        ]
      },
      {
        title: "Next Follow-up Date Time (NFDT)",
        description: "Schedule and track follow-ups",
        steps: [
          "Set the NFDT field when updating a lead",
          "Choose date and time for next contact",
          "Dashboard highlights overdue follow-ups",
          "Filter to see 'Today's Follow-ups'",
          "NFDT compliance is tracked in targets"
        ]
      },
      {
        title: "Delete and Recover Leads",
        description: "Soft delete with 30-day recovery",
        steps: [
          "Click on lead and select Delete",
          "Lead is soft-deleted (not permanently removed)",
          "Admins can recover deleted leads within 30 days",
          "Go to Admin Console → Deleted Leads to recover"
        ]
      },
      {
        title: "Search and Filter",
        description: "Find leads quickly",
        steps: [
          "Use the search bar to find by name, mobile, or any field",
          "Apply column filters to narrow results",
          "Combine multiple filters",
          "Save frequently used filters"
        ]
      }
    ]
  },
  {
    id: "import-export",
    name: "Import and Export Data",
    icon: Upload,
    description: "Bulk import from Excel/CSV and export data",
    items: [
      {
        title: "Import Leads from Excel/CSV",
        description: "Bulk upload leads from spreadsheets",
        steps: [
          "Go to Dashboard, select target sheet",
          "Click 'Import' button",
          "Select your Excel (.xlsx) or CSV file",
          "System shows preview of your data",
          "Map your file columns to CRM fields",
          "Required: Map name to 'Full Name', phone to 'Mobile No'",
          "Review and confirm mapping"
        ]
      },
      {
        title: "Handle Duplicates During Import",
        description: "Review and resolve duplicates before importing",
        steps: [
          "After column mapping, 'Duplicates' step appears",
          "System shows all detected duplicates with existing lead details",
          "For each duplicate, choose: Skip, Merge, or Add Anyway",
          "Use 'Skip All Duplicates' for bulk action",
          "Continue import after resolving all duplicates"
        ],
        tips: ["Duplicates are detected by normalizing mobile numbers (last 10 digits)"]
      },
      {
        title: "Export Leads to Excel",
        description: "Download lead data",
        steps: [
          "Go to Dashboard with sheet selected",
          "Apply any filters to limit data (optional)",
          "Click 'Export' button",
          "Choose columns to include",
          "Select format: Excel or CSV",
          "File downloads to your computer"
        ],
        tips: ["Export respects current filters - only visible leads are exported"]
      }
    ]
  },
  {
    id: "duplicates",
    name: "Preventing Duplicate Customers",
    icon: Copy,
    description: "How Leadani prevents duplicate leads everywhere",
    badge: "Important",
    items: [
      {
        title: "How Duplicate Detection Works",
        description: "Mobile number is the unique identifier",
        steps: [
          "System normalizes mobile numbers automatically",
          "Removes spaces, dashes, + signs, country codes",
          "Compares last 10 digits",
          "Duplicates detected across entire company (all sheets)"
        ]
      },
      {
        title: "Manual Add - Duplicate Dialog",
        description: "When you try to add a duplicate manually",
        steps: [
          "System checks mobile number before saving",
          "If duplicate found, shows existing lead details",
          "See which sheet and who's handling the lead",
          "Choose 'Merge' to combine data with existing lead",
          "Choose 'Don't Add' to cancel"
        ]
      },
      {
        title: "Bulk Import - Duplicates Step",
        description: "Dedicated review for import duplicates",
        steps: [
          "After column mapping, duplicates step appears",
          "All conflicts listed with existing lead details",
          "Handle individually: Skip, Merge, or Add Anyway",
          "Or bulk: 'Skip All' or 'Merge All'",
          "Continue only after resolving all duplicates"
        ]
      },
      {
        title: "Webhook Duplicates",
        description: "Configurable handling for automated leads",
        steps: [
          "Configure 'match_mode' in webhook settings:",
          "- create_new: Always creates (may create duplicates)",
          "- update_existing: Updates the existing lead",
          "- skip_duplicate: Ignores if duplicate exists",
          "Choose based on your use case"
        ]
      },
      {
        title: "Server-Side Enforcement",
        description: "Protection even if UI is bypassed",
        steps: [
          "API validates all lead creation requests",
          "Duplicate check runs on server before save",
          "Cannot bypass duplicate prevention",
          "Ensures data integrity"
        ]
      }
    ]
  },
  {
    id: "webhooks",
    name: "Automating Lead Collection",
    icon: Webhook,
    description: "Receive leads automatically from Facebook, forms, landing pages",
    badge: "Advanced",
    items: [
      {
        title: "What is a Webhook?",
        description: "Automatic lead ingestion from external sources",
        steps: [
          "Webhook = URL that receives data from other systems",
          "When someone fills a form, data is sent to Leadani",
          "Leads created automatically without manual entry",
          "Common sources: Facebook Lead Ads, Google Forms, websites"
        ]
      },
      {
        title: "Create a Webhook",
        description: "Set up automated lead collection",
        steps: [
          "Go to Webhooks section (Admin only)",
          "Click 'Create Webhook'",
          "Enter a name (e.g., 'Facebook Leads')",
          "Configure field mapping (next section)",
          "Set up allocation rules (which sheet gets leads)",
          "Save and copy the webhook URL",
          "Paste URL into your lead source (Facebook, form builder, etc.)"
        ]
      },
      {
        title: "Field Mapping",
        description: "Tell Leadani how to read incoming data",
        steps: [
          "After creating webhook, go to Field Mapping",
          "Incoming field names shown on left",
          "Select matching CRM field on right",
          "Map at minimum: name → Full Name, phone → Mobile No",
          "Map other fields as needed",
          "Save the mapping"
        ],
        tips: ["Send a test lead first to see incoming field names"]
      },
      {
        title: "Multi-Field Matching",
        description: "Match one webhook field to multiple CRM fields",
        steps: [
          "Example: Match 'phone' to both 'Mobile No' and 'WhatsApp' fields",
          "Uses OR logic - matches any of the mapped fields",
          "Useful when same data should check multiple columns",
          "Configure in advanced field mapping settings"
        ]
      },
      {
        title: "Dropdown Auto-Detection",
        description: "Automatically match dropdown values",
        steps: [
          "Webhooks can auto-detect dropdown values",
          "Incoming values matched to existing options",
          "If exact match found, uses existing option",
          "Configure behavior for unmatched values"
        ]
      }
    ]
  },
  {
    id: "allocation",
    name: "Lead Allocation Rules",
    icon: GitBranch,
    description: "Route leads to the right sheets automatically",
    badge: "Advanced",
    items: [
      {
        title: "What are Allocation Rules?",
        description: "Determine which sheet receives each lead",
        steps: [
          "Rules evaluate incoming lead data",
          "Based on conditions, route to specific sheet(s)",
          "Example: If Source = 'Facebook', go to Sheet A",
          "Example: If Language = 'Hindi', go to Hindi Team sheet"
        ]
      },
      {
        title: "Create Conditions",
        description: "Define when rules apply",
        steps: [
          "Add conditions based on incoming fields",
          "Operators: equals, contains, starts with, etc.",
          "Combine multiple conditions with AND/OR logic",
          "Example: Source = 'Facebook' AND City = 'Mumbai'"
        ]
      },
      {
        title: "Multi-Sheet Allocation",
        description: "Split leads across multiple sheets",
        steps: [
          "Within one condition group, add multiple sheets",
          "Assign percentage to each sheet",
          "Example: Sales Team 1 (40%), Sales Team 2 (30%), Sales Team 3 (30%)",
          "Percentages must total exactly 100%"
        ]
      },
      {
        title: "Weighted Round-Robin Distribution",
        description: "How percentage splits work",
        steps: [
          "Leads distributed according to percentages over time",
          "System tracks allocation counts per condition",
          "Each lead goes to sheet most 'behind' its target %",
          "Example: 40/30/30 split → 4/3/3 distribution over 10 leads",
          "Ensures fair distribution matching your percentages"
        ]
      },
      {
        title: "When No Rule Matches",
        description: "Graceful handling of unmatched leads",
        steps: [
          "Webhook still accepts the lead (doesn't fail)",
          "Lead goes to 'No Allocation' queue",
          "Users are notified to review unallocated leads",
          "Push to CRM manually after review"
        ],
        tips: ["Set up a 'catch-all' rule for unmatched leads"]
      },
      {
        title: "Allocation Health Indicator",
        description: "See if your rules cover all scenarios",
        steps: [
          "View allocation health in webhook settings",
          "Shows coverage across all condition paths",
          "Identifies gaps where leads might not be allocated",
          "Helps optimize your rule setup"
        ]
      }
    ]
  },
  {
    id: "webhook-updates",
    name: "Updating Leads via Webhook",
    icon: RefreshCw,
    description: "Update existing leads automatically from external systems",
    items: [
      {
        title: "Match Mode Options",
        description: "Control how webhooks handle existing leads",
        steps: [
          "create_new: Always create new lead (ignores duplicates)",
          "update_existing: Find existing lead and update it",
          "skip_duplicate: Don't create if lead already exists"
        ]
      },
      {
        title: "Update-Only Flow",
        description: "Configure webhook to only update, never create",
        steps: [
          "Set match_mode = 'match_and_update'",
          "Set no_match_action = 'ignore'",
          "Set skip_allocation_on_match = true",
          "Webhook will only update existing leads",
          "No new leads created, no allocation needed"
        ],
        tips: ["Perfect for syncing updates from external CRM or call systems"]
      },
      {
        title: "Skip Allocation on Match",
        description: "Don't re-allocate when updating existing lead",
        steps: [
          "When lead already exists in a sheet",
          "skip_allocation_on_match = true",
          "Updates go to existing lead in its current sheet",
          "Doesn't move lead to different sheet"
        ]
      },
      {
        title: "Webhook Logs",
        description: "Debug and monitor webhook activity",
        steps: [
          "Go to Webhooks → Logs",
          "See all incoming webhook requests",
          "View success/failure status",
          "See full payload for debugging",
          "Identify field mapping issues"
        ]
      }
    ]
  },
  {
    id: "targets",
    name: "Setting Performance Targets",
    icon: Target,
    description: "Track team performance against goals",
    items: [
      {
        title: "Goal Types",
        description: "Different ways to measure performance",
        steps: [
          "Count: Number of leads (e.g., add 50 leads)",
          "Sum: Total of a numeric field",
          "Average: Average of a numeric field",
          "Percentage: Ratio calculation",
          "Updates: Number of lead updates made",
          "Conversion: Leads that reached a status",
          "Compliance: Following rules (e.g., NFDT set)"
        ]
      },
      {
        title: "Create a Target",
        description: "Set up performance tracking",
        steps: [
          "Go to Admin Console → Targets",
          "Click 'Create Target'",
          "Enter target name and goal type",
          "Set the target value",
          "Choose time type: one-time or recurring",
          "Assign to users"
        ]
      },
      {
        title: "Assignment Options",
        description: "Who the target applies to",
        steps: [
          "Single user: One specific person",
          "Multiple users: Select specific people",
          "All users: Applies to everyone",
          "Each user tracked individually against the goal"
        ]
      },
      {
        title: "Scope Options",
        description: "Which leads count toward the target",
        steps: [
          "Sheet-specific: Only leads in a specific sheet",
          "Multiple sheets: Leads across selected sheets",
          "Company-wide: All leads in the company"
        ]
      },
      {
        title: "Time Types",
        description: "One-time vs recurring targets",
        steps: [
          "One-time: Set a date range, counts leads in that period",
          "Recurring: Daily, weekly, or monthly reset",
          "Recurring tracks progress per period"
        ]
      },
      {
        title: "Leaderboard",
        description: "Compare team performance",
        steps: [
          "View rankings by target",
          "Filter by time: Daily, Weekly, Monthly, All-time",
          "See who's ahead and who needs support",
          "Click user to see their detailed progress"
        ]
      }
    ]
  },
  {
    id: "highlighting",
    name: "Visual Highlighting Rules",
    icon: Palette,
    description: "Color-code leads based on conditions",
    items: [
      {
        title: "What are Highlighting Rules?",
        description: "Automatically color rows based on lead data",
        steps: [
          "Rules evaluate lead field values",
          "Matching leads get highlighted with a color",
          "Example: Status = 'Hot' → Green highlight",
          "Example: NFDT overdue → Red highlight"
        ]
      },
      {
        title: "Create a Rule",
        description: "Set up conditional highlighting",
        steps: [
          "Go to Admin Console → Highlighting Rules",
          "Click 'Add Rule'",
          "Enter rule name",
          "Add conditions (field, operator, value)",
          "Combine with AND/OR logic",
          "Select highlight color",
          "Save the rule"
        ]
      },
      {
        title: "Available Colors",
        description: "12 color options",
        steps: [
          "Yellow, Orange, Red, Green, Blue, Purple, Pink",
          "Dark Red, Light Green, Dark Green, Light Blue, Dark Blue",
          "Choose colors that stand out but aren't distracting"
        ]
      },
      {
        title: "Sheet-Specific vs Global Rules",
        description: "Control where rules apply",
        steps: [
          "Sheet-specific: Only applies to one sheet",
          "Global: Applies to all sheets in your company",
          "Use global for company-wide standards",
          "Use sheet-specific for team-specific needs"
        ]
      },
      {
        title: "Real-Time Sync",
        description: "Highlighting updates instantly",
        steps: [
          "Rules sync across all connected users",
          "When lead data changes, highlighting updates",
          "When rules change, all users see immediately"
        ]
      }
    ]
  },
  {
    id: "row-filters",
    name: "User Row Filters (Hide/Show)",
    icon: Filter,
    description: "Per-user filters to hide rows from view",
    items: [
      {
        title: "What are Row Filters?",
        description: "Personal filters that persist",
        steps: [
          "Each user can create their own filters",
          "Filters hide matching rows from view",
          "Persists to database - stays after logout",
          "Different from column filters (those don't persist)"
        ]
      },
      {
        title: "Create a Filter",
        description: "Set up personal row filtering",
        steps: [
          "Click 'Hide/Show Rows' in sidebar",
          "Click 'Create Filter'",
          "Give it a name (e.g., 'Hide Closed Leads')",
          "Add conditions (field, operator, value)",
          "Use AND/OR logic for multiple conditions",
          "Save the filter"
        ]
      },
      {
        title: "Toggle Filters",
        description: "Turn filters on and off",
        steps: [
          "Active filters hide matching rows",
          "Click toggle to activate/deactivate",
          "See count of active filters",
          "Quickly switch between different views"
        ]
      }
    ]
  },
  {
    id: "attendance",
    name: "Team Attendance Tracking",
    icon: Clock,
    description: "Check-in, check-out, and exit rules",
    items: [
      {
        title: "Daily Check-In",
        description: "Record start of work day",
        steps: [
          "Go to Attendance from sidebar",
          "Click 'Check In'",
          "Location and time recorded",
          "Selfie may be required for verification"
        ]
      },
      {
        title: "Check-Out",
        description: "Record end of work day",
        steps: [
          "Go to Attendance",
          "Click 'Check Out'",
          "May need to meet exit requirements first",
          "Time is recorded"
        ]
      },
      {
        title: "Exit Rules",
        description: "Requirements before checking out",
        steps: [
          "Minimum hours worked",
          "Minimum leads added",
          "Minimum lead updates made",
          "NFDT compliance (follow-ups scheduled)",
          "If not met, need admin approval to exit"
        ]
      },
      {
        title: "Force Exit Request",
        description: "Leave early with approval",
        steps: [
          "Click 'Request Force Exit'",
          "Enter reason for leaving early",
          "Submit request",
          "Admin reviews and approves/rejects",
          "Once approved, can check out"
        ]
      },
      {
        title: "Admin: Review Force Exits",
        description: "Approve or reject early exits",
        steps: [
          "Go to Admin Console → Attendance",
          "View pending Force Exit requests",
          "See reason and user's work for the day",
          "Click Approve or Reject",
          "User is notified of decision"
        ]
      }
    ]
  },
  {
    id: "reports",
    name: "Reports and Analytics",
    icon: BarChart3,
    description: "Build reports and analyze performance",
    items: [
      {
        title: "Report Builder",
        description: "Create custom reports",
        steps: [
          "Go to Reports from sidebar",
          "Click 'Create Report'",
          "Name your report",
          "Select sheet(s) to include (Admins can select multiple)",
          "Choose columns to display",
          "Add filters (date range, status, etc.)",
          "Save the report"
        ]
      },
      {
        title: "Date Filtering",
        description: "Filter by time periods",
        steps: [
          "Use preset ranges: Today, This Week, This Month",
          "Or choose Custom Range for specific dates",
          "All reports respect company timezone"
        ]
      },
      {
        title: "Group By",
        description: "Aggregate data by field",
        steps: [
          "Select 'Group By' option in report builder",
          "Choose field: Status, Source, User, etc.",
          "Report shows counts per group",
          "Drill down into each group for details"
        ]
      },
      {
        title: "Drill-Down",
        description: "See details behind numbers",
        steps: [
          "Click on any number or group in report",
          "View individual leads that make up that count",
          "Understand what's behind your metrics"
        ]
      },
      {
        title: "Team Performance",
        description: "Compare user performance",
        steps: [
          "Go to Team Performance from sidebar",
          "See metrics for all team members",
          "Filter by date range",
          "Click user for detailed breakdown"
        ]
      },
      {
        title: "Export Reports",
        description: "Download for offline analysis",
        steps: [
          "Open any report",
          "Click 'Export' button",
          "Choose Excel or CSV format",
          "File downloads with report data"
        ]
      }
    ]
  },
  {
    id: "backup",
    name: "Google Sheets Backup",
    icon: Cloud,
    description: "Automatic backup to Google Sheets",
    items: [
      {
        title: "How Backup Works",
        description: "Automatic lead data backup",
        steps: [
          "Configure a Google Sheet URL for each sheet",
          "Leads automatically synced hourly",
          "Full lead data including custom columns",
          "Up to 10 update history entries per lead"
        ]
      },
      {
        title: "Setup Backup",
        description: "Connect your Google Sheet",
        steps: [
          "Create a Google Sheet for backup",
          "Share it with the Leadani Google account",
          "Go to Admin Console → Google Sheets Backup",
          "Enter the Google Sheet URL for your sheet",
          "Save configuration"
        ]
      },
      {
        title: "Manual Sync",
        description: "Trigger immediate backup",
        steps: [
          "Go to Google Sheets Backup settings",
          "Click 'Sync Now' for the sheet",
          "Backup runs immediately",
          "Check sync logs for status"
        ]
      },
      {
        title: "Sync Logs",
        description: "Monitor backup status",
        steps: [
          "View sync history",
          "See success or error status",
          "Check timestamps of last sync",
          "Troubleshoot issues"
        ]
      }
    ]
  },
  {
    id: "recovery",
    name: "Data Recovery",
    icon: Database,
    description: "Point-in-time recovery and data protection",
    badge: "Super Admin",
    items: [
      {
        title: "Automatic Snapshots",
        description: "Hourly backups of all data",
        steps: [
          "System takes snapshots automatically every hour",
          "30-day retention of snapshots",
          "Smart change detection - skips unchanged sheets",
          "Includes all leads and update history"
        ]
      },
      {
        title: "Restore from Snapshot",
        description: "Recover data to a previous point in time",
        steps: [
          "Go to Super Admin Console → Recovery",
          "Browse: Company → Sheet → Date → Time",
          "Select the snapshot to restore from",
          "Preview shows impact: leads to restore/remove/update",
          "Confirm restore",
          "Audit log records the recovery"
        ]
      }
    ]
  },
  {
    id: "data-management",
    name: "Bulk Data Operations",
    icon: Layers,
    description: "Clear data and transfer leads in bulk",
    items: [
      {
        title: "Clear Past Data",
        description: "Bulk delete leads with optional date filter",
        steps: [
          "Go to Admin Console → Data Management",
          "Click 'Clear Past Data'",
          "Optionally filter by date (delete leads before X date)",
          "Type 'DELETE' to confirm (safety measure)",
          "Leads are soft-deleted (recoverable within 30 days)"
        ],
        tips: ["This is company-wide - affects all sheets"]
      },
      {
        title: "Bulk Transfer Leads",
        description: "Move leads from one sheet to others",
        steps: [
          "Go to Admin Console → Data Management",
          "Click 'Bulk Transfer Leads'",
          "Select source sheet",
          "Select destination sheet(s)",
          "Set percentage split if multiple destinations",
          "System checks for duplicates before transfer",
          "Transfer history added to lead updates"
        ],
        tips: ["Uses weighted round-robin for percentage splits, just like webhook allocation"]
      }
    ]
  },
  {
    id: "mobile",
    name: "Mobile Experience",
    icon: Smartphone,
    description: "Leadani on your phone",
    items: [
      {
        title: "Install as App (PWA)",
        description: "Add to home screen for app-like experience",
        steps: [
          "Open Leadani in mobile browser",
          "Android: Menu → Add to Home Screen",
          "iPhone: Share → Add to Home Screen",
          "App icon appears on home screen",
          "Opens in full-screen mode"
        ]
      },
      {
        title: "Mobile Lead Cards",
        description: "Touch-friendly lead management",
        steps: [
          "Leads display as cards on mobile",
          "Swipe or tap to view details",
          "Configure which fields show on cards",
          "Quick actions available"
        ]
      },
      {
        title: "Mobile Lead Editing",
        description: "Update leads on the go",
        steps: [
          "Tap lead card to open details",
          "Edit any field",
          "Add updates",
          "Save changes"
        ]
      },
      {
        title: "Mobile Sort & Filter",
        description: "Find leads on mobile",
        steps: [
          "Access sort and filter from mobile header",
          "Apply filters same as desktop",
          "Results update immediately"
        ]
      }
    ]
  },
  {
    id: "security",
    name: "Security & Audit",
    icon: Shield,
    description: "Data protection and activity tracking",
    items: [
      {
        title: "Role-Based Access",
        description: "Control who sees what",
        steps: [
          "Three-tier role system (Super Admin, Admin, User)",
          "Sheet-level permissions",
          "Users only see assigned sheets",
          "Admins see everything in their company"
        ]
      },
      {
        title: "Audit Logging",
        description: "Track all activity",
        steps: [
          "All lead changes are logged",
          "Who made the change, when, what changed",
          "Preserved even if user is deleted",
          "Admins can review audit history"
        ]
      },
      {
        title: "Webhook Security",
        description: "Protect webhook endpoints",
        steps: [
          "HMAC signature validation available",
          "Prevents unauthorized data submission",
          "Rate limiting protects against abuse"
        ]
      },
      {
        title: "Password-Protected Actions",
        description: "Extra safety for destructive operations",
        steps: [
          "Sheet deletion requires password confirmation",
          "Critical operations have type-to-confirm",
          "Prevents accidental data loss"
        ]
      }
    ]
  }
];

export default function Guide() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Business Owner Guide</h1>
              <p className="text-xs text-muted-foreground">Everything you can do in Leadani</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/help">
              <Button variant="outline" size="sm" data-testid="button-go-to-help">
                <HelpCircle className="h-4 w-4 mr-2" />
                FAQ
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              {guideData.length} Sections
            </Badge>
            <Badge variant="outline" className="text-xs">
              {guideData.reduce((acc, s) => acc + s.items.length, 0)} Topics
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Explore all Leadani features organized by what you want to achieve. Click any section to expand.
          </p>
        </div>

        <div className="grid gap-4">
          {guideData.map((section) => (
            <Card 
              key={section.id} 
              className={`transition-all ${expandedSection === section.id ? 'ring-2 ring-primary' : ''}`}
              data-testid={`section-card-${section.id}`}
            >
              <CardHeader 
                className="cursor-pointer hover-elevate py-4"
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                data-testid={`section-header-${section.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{section.name}</CardTitle>
                        {section.badge && (
                          <Badge variant="secondary" className="text-xs">{section.badge}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {section.items.length} topics
                    </Badge>
                    <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSection === section.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </CardHeader>

              {expandedSection === section.id && (
                <CardContent className="pt-0 pb-4">
                  <ScrollArea className="max-h-[600px]">
                    <Accordion type="multiple" className="w-full">
                      {section.items.map((item, idx) => (
                        <AccordionItem 
                          key={idx} 
                          value={`${section.id}-${idx}`}
                          className="border-b last:border-b-0"
                          data-testid={`accordion-item-${section.id}-${idx}`}
                        >
                          <AccordionTrigger className="py-3 hover:no-underline">
                            <div className="flex items-center gap-2 text-left">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <div>
                                <span className="font-medium text-sm">{item.title}</span>
                                <p className="text-xs text-muted-foreground font-normal">{item.description}</p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            {item.steps && (
                              <div className="ml-6 space-y-1">
                                {item.steps.map((step, stepIdx) => (
                                  <div key={stepIdx} className="flex items-start gap-2 text-sm">
                                    <span className="text-muted-foreground font-mono text-xs mt-0.5">{stepIdx + 1}.</span>
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.tips && item.tips.length > 0 && (
                              <div className="ml-6 mt-3 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                                <div className="flex items-start gap-2">
                                  <Zap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <div className="text-sm text-amber-700 dark:text-amber-400">
                                    <span className="font-medium">Tip: </span>
                                    {item.tips.join(" ")}
                                  </div>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </ScrollArea>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 rounded-lg border bg-muted/30 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Need help with a specific question?
          </p>
          <Link href="/help">
            <Button variant="default" size="sm" data-testid="button-go-to-faq">
              <HelpCircle className="h-4 w-4 mr-2" />
              Search FAQ with AI
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}


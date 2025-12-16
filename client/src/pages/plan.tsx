import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Bug, Sparkles, Wrench, Zap } from "lucide-react";

// Format date string directly to avoid timezone issues
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
}

type ChangeType = "feature" | "bugfix" | "improvement" | "infrastructure";

interface ChangelogEntry {
  date: string;
  description: string;
  impact: string;
  type: ChangeType;
}

const typeConfig: Record<ChangeType, { label: string; icon: typeof Sparkles; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  feature: { label: "Feature", icon: Sparkles, variant: "default" },
  bugfix: { label: "Bug Fix", icon: Bug, variant: "destructive" },
  improvement: { label: "Improvement", icon: Zap, variant: "secondary" },
  infrastructure: { label: "Infrastructure", icon: Wrench, variant: "outline" },
};

// Add new entries at the top (newest first)
const changelog: ChangelogEntry[] = [
  {
    date: "2025-12-16",
    description: "Added 'Add Lead' button in header for quick access",
    impact: "Users can now add leads from anywhere in the app without scrolling",
    type: "feature",
  },
  {
    date: "2025-12-16",
    description: "Fixed update history hover card bleed-through issue",
    impact: "History preview now displays cleanly above table rows",
    type: "bugfix",
  },
  {
    date: "2025-12-16",
    description: "Added update history hover preview with top 5 updates",
    impact: "Quick preview of lead history without opening full dialog",
    type: "feature",
  },
  {
    date: "2025-12-15",
    description: "Added 'Clear selection' option to dropdown fields",
    impact: "Users can now reset dropdown values in mobile and desktop editing",
    type: "improvement",
  },
  {
    date: "2025-12-15",
    description: "Fixed validation rules to check auto-filled columns too",
    impact: "Validation now properly triggers for both manual and auto-filled fields",
    type: "bugfix",
  },
  {
    date: "2025-12-15",
    description: "Redesigned mobile lead editing with spreadsheet-style interface",
    impact: "Mobile editing now feels like Excel with cell-based layout",
    type: "feature",
  },
  {
    date: "2025-12-14",
    description: "Implemented Auto-Fill Rules feature for automatic field population",
    impact: "Target fields auto-populate when trigger conditions are met",
    type: "feature",
  },
  {
    date: "2025-12-14",
    description: "Added Auto-Fill Rules admin UI with drag-drop priority ordering",
    impact: "Admins can configure and reorder auto-fill rules easily",
    type: "feature",
  },
  {
    date: "2025-12-13",
    description: "Added 'Add Lead' form configuration for company admins",
    impact: "Admins can customize which fields appear when adding new leads",
    type: "feature",
  },
  {
    date: "2025-12-12",
    description: "Fixed company timezone handling inconsistencies",
    impact: "Dates and times now display correctly across all timezones",
    type: "bugfix",
  },
  {
    date: "2025-12-11",
    description: "Implemented Validation Rules with multi-condition logic",
    impact: "Users get prompted to update related fields based on configurable rules",
    type: "feature",
  },
  {
    date: "2025-12-10",
    description: "Added Custom Views with configurable sidebar menu items",
    impact: "Users can create filtered lead views with custom icons and badges",
    type: "feature",
  },
  {
    date: "2025-12-09",
    description: "Implemented Hot Leads feature with real-time badge counts",
    impact: "High-value leads are now highlighted company-wide for prioritization",
    type: "feature",
  },
  {
    date: "2025-12-08",
    description: "Added Visit Schedules calendar view for site visits",
    impact: "Teams can track and manage scheduled site visits visually",
    type: "feature",
  },
  {
    date: "2025-12-07",
    description: "Built Data Management console for bulk operations",
    impact: "Admins can clear past data and bulk transfer leads with weighted distribution",
    type: "feature",
  },
  {
    date: "2025-12-06",
    description: "Implemented Point-in-Time Sheet Recovery (Snapshots)",
    impact: "SuperAdmins can restore sheets to any previous state within 30 days",
    type: "feature",
  },
  {
    date: "2025-12-05",
    description: "Added Google Sheets automatic backup system",
    impact: "Lead data is backed up hourly to Google Sheets for redundancy",
    type: "feature",
  },
  {
    date: "2025-12-04",
    description: "Implemented User Row Filters with database persistence",
    impact: "Users can create named filters that persist across sessions",
    type: "feature",
  },
  {
    date: "2025-12-03",
    description: "Built Target Management System with leaderboard rankings",
    impact: "Teams can set goals, track progress, and compete on leaderboards",
    type: "feature",
  },
  {
    date: "2025-12-02",
    description: "Added Attendance System with mobile-first PWA",
    impact: "Employees can check in/out from their phones with configurable rules",
    type: "feature",
  },
  {
    date: "2025-12-01",
    description: "Implemented self-service company signup and onboarding",
    impact: "New companies can register and set up their workspace independently",
    type: "feature",
  },
  {
    date: "2025-11-30",
    description: "Added webhook integration with field mapping and round-robin",
    impact: "External systems can push leads with automatic user allocation",
    type: "feature",
  },
  {
    date: "2025-11-29",
    description: "Implemented highlighting rules engine for conditional row styling",
    impact: "Rows are highlighted based on configurable multi-condition logic",
    type: "feature",
  },
  {
    date: "2025-11-28",
    description: "Added NFDT (Next Follow-up Date Time) highlighting",
    impact: "Overdue and upcoming follow-ups are visually distinguished",
    type: "feature",
  },
  {
    date: "2025-11-27",
    description: "Built dynamic column management system",
    impact: "Companies can create custom columns with validation rules",
    type: "feature",
  },
  {
    date: "2025-11-26",
    description: "Implemented three-tier role-based access control",
    impact: "Super Admin, Company Admin, and User roles with sheet-level permissions",
    type: "feature",
  },
  {
    date: "2025-11-25",
    description: "Added chronological lead update tracking with audit trail",
    impact: "Every lead change is logged with user, timestamp, and details",
    type: "feature",
  },
  {
    date: "2025-11-24",
    description: "Built Excel/CSV import and export functionality",
    impact: "Users can bulk import leads and export data for external analysis",
    type: "feature",
  },
  {
    date: "2025-11-23",
    description: "Implemented duplicate lead prevention across all entry points",
    impact: "No more duplicate leads from imports, webhooks, or manual entry",
    type: "feature",
  },
  {
    date: "2025-11-22",
    description: "Added real-time synchronization with Socket.io",
    impact: "Changes sync instantly across all connected users",
    type: "feature",
  },
  {
    date: "2025-11-21",
    description: "Built spreadsheet-like grid interface with inline editing",
    impact: "Excel-familiar UI makes lead management intuitive",
    type: "feature",
  },
  {
    date: "2025-11-20",
    description: "Launched Leadani LFS - Multi-tenant lead management system",
    impact: "Complete CRM platform with company isolation and mobile support",
    type: "feature",
  },
];

export default function Plan() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Development Plan</h1>
              <p className="text-sm text-muted-foreground">What we're building every day</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Changelog
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track our progress as we continuously improve Leadani LFS
            </p>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-6 pb-4 border-b">
              {Object.entries(typeConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Badge key={key} variant={config.variant} className="gap-1">
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                );
              })}
            </div>

            {/* Changelog entries */}
            <div className="space-y-4">
              {changelog.map((entry, index) => {
                const config = typeConfig[entry.type];
                const Icon = config.icon;
                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr_100px] gap-3 md:gap-4 p-4 rounded-lg border bg-card hover-elevate"
                    data-testid={`changelog-entry-${index}`}
                  >
                    {/* Date */}
                    <div className="text-sm font-medium text-muted-foreground md:text-right">
                      {formatDate(entry.date)}
                    </div>

                    {/* Description */}
                    <div className="text-sm font-medium">
                      {entry.description}
                    </div>

                    {/* Impact */}
                    <div className="text-sm text-muted-foreground">
                      {entry.impact}
                    </div>

                    {/* Type Badge */}
                    <div className="flex md:justify-end">
                      <Badge variant={config.variant} className="gap-1 h-fit">
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Want to see these features in action?
          </p>
          <Link href="/signup">
            <Button data-testid="button-signup-cta">
              Get Started Free
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

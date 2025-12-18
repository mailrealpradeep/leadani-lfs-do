import { useLocation, Link } from "wouter";
import { ClipboardList, Trophy, BarChart3, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  label: string;
  icon: typeof ClipboardList;
  path: string;
  paths: string[];
}

const tabs: TabItem[] = [
  {
    label: "Leads",
    icon: ClipboardList,
    path: "/",
    paths: ["/", "/dashboard"],
  },
  {
    label: "Leaderboard",
    icon: Trophy,
    path: "/leaderboard",
    paths: ["/leaderboard"],
  },
  {
    label: "Reports",
    icon: BarChart3,
    path: "/reports",
    paths: ["/reports"],
  },
  {
    label: "Visits",
    icon: CalendarCheck,
    path: "/visits",
    paths: ["/visits"],
  },
];

export function BottomTabBar() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      data-testid="bottom-tab-bar"
    >
      <div className="flex items-stretch justify-around h-14">
        {tabs.map((tab) => {
          const isActive = tab.paths.some((p) => 
            p === "/" ? location === "/" || location === "/dashboard" : location.startsWith(p)
          );
          const Icon = tab.icon;

          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 px-2 py-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`tab-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className={cn(
                "text-[10px] font-medium leading-tight",
                isActive && "font-semibold"
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

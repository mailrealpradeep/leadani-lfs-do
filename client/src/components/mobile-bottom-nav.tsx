import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, Calendar, BarChart3, Menu, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

interface NavItem {
  label: string;
  icon: typeof LayoutGrid;
  href?: string;
  action?: "menu";
  testId: string;
}

const navItems: NavItem[] = [
  { label: "Leads", icon: LayoutGrid, href: "/", testId: "nav-leads" },
  { label: "Visits", icon: Calendar, href: "/visits", testId: "nav-visits" },
  { label: "Target", icon: Crosshair, href: "/working-target", testId: "nav-target" },
  { label: "Reports", icon: BarChart3, href: "/reports", testId: "nav-reports" },
  { label: "Menu", icon: Menu, action: "menu", testId: "nav-menu" },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const { setOpenMobile } = useSidebar();

  const handleNavClick = (item: NavItem) => {
    if (item.action === "menu") {
      setOpenMobile(true);
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom"
      data-testid="mobile-bottom-nav"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.href ? 
            (item.href === "/" ? location === "/" || location === "/dashboard" : location === item.href) 
            : false;
          const Icon = item.icon;

          if (item.action === "menu") {
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className="flex flex-col items-center justify-center flex-1 py-2 gap-1 min-w-0"
                data-testid={item.testId}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                  "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link key={item.label} href={item.href!}>
              <a
                className="flex flex-col items-center justify-center flex-1 py-2 gap-1 min-w-0"
                data-testid={item.testId}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

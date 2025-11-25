import { useAuth } from "@/lib/auth";
import { ExecutivePerformanceCard } from "@/components/executive-performance-card";

export default function TeamPerformance() {
  const { user } = useAuth();

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-team-performance-title">
            Team Performance
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Track executive performance across sheets and time periods
          </p>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        <ExecutivePerformanceCard />
      </div>
    </div>
  );
}

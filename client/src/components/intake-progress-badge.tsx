import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClipboardList, CheckCircle2, XCircle, PauseCircle } from "lucide-react";

export interface IntakeBadgeData {
  depth: number;
  total: number;
  status: string; // 'active' | 'paused' | 'completed' | 'abandoned'
  flow_name: string | null;
}

interface Props {
  data?: IntakeBadgeData | null;
  size?: "sm" | "xs";
  className?: string;
  testId?: string;
}

// Renders a compact status badge for a lead's latest Saila Intake session.
// Empty (returns null) when there is no session yet — keeps row chrome clean.
export function IntakeProgressBadge({ data, size = "sm", className, testId }: Props) {
  if (!data) return null;

  const { depth, total, status, flow_name } = data;
  const heightClass = size === "xs" ? "h-5 px-1.5 text-[10px]" : "h-6 px-1.5 text-xs";
  const iconClass = size === "xs" ? "w-2.5 h-2.5 mr-0.5" : "w-3 h-3 mr-0.5";

  let label = "";
  let Icon = ClipboardList;
  let color = "text-blue-600 border-blue-500/30 dark:text-blue-400";

  if (status === "completed") {
    label = "Intake done";
    Icon = CheckCircle2;
    color = "text-emerald-600 border-emerald-500/30 dark:text-emerald-400";
  } else if (status === "abandoned") {
    label = depth > 0 ? `Intake stopped (Q${depth})` : "Intake stopped";
    Icon = XCircle;
    color = "text-red-600 border-red-500/30 dark:text-red-400";
  } else if (status === "paused") {
    label = total > 0 ? `Intake paused ${depth}/${total}` : `Intake paused (Q${depth})`;
    Icon = PauseCircle;
    color = "text-amber-600 border-amber-500/30 dark:text-amber-400";
  } else {
    // active / unknown — treat as in-progress
    label = total > 0 ? `Intake ${depth}/${total}` : `Intake Q${depth}`;
    Icon = ClipboardList;
    color = "text-blue-600 border-blue-500/30 dark:text-blue-400";
  }

  const tooltip = [
    flow_name ? `Flow: ${flow_name}` : null,
    `Status: ${status}`,
    total > 0 ? `Question ${depth}/${total}` : `Question ${depth}`,
  ].filter(Boolean).join(" · ");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`${heightClass} ${color} flex-shrink-0 ${className || ""}`}
          data-testid={testId}
        >
          <Icon className={iconClass} />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

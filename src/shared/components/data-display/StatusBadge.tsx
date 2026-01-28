/**
 * Status Badge Component
 * Consistent status display across the app
 */

import { cn } from "@/lib/utils";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Activity,
  Ban,
  Shield
} from "lucide-react";

type StatusType = 
  | "active" 
  | "resolved" 
  | "cancelled" 
  | "escalated" 
  | "pending" 
  | "accepted" 
  | "rejected"
  | "late"
  | "arrived"
  | "safe";

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<StatusType, {
  label: string;
  bgClass: string;
  textClass: string;
  icon: typeof CheckCircle;
}> = {
  active: {
    label: "Active",
    bgClass: "bg-success/20",
    textClass: "text-success",
    icon: Activity,
  },
  resolved: {
    label: "Resolved",
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
    icon: XCircle,
  },
  escalated: {
    label: "Escalated",
    bgClass: "bg-destructive/20",
    textClass: "text-destructive",
    icon: AlertTriangle,
  },
  pending: {
    label: "Pending",
    bgClass: "bg-warning/20",
    textClass: "text-warning",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    bgClass: "bg-success/20",
    textClass: "text-success",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    bgClass: "bg-destructive/20",
    textClass: "text-destructive",
    icon: Ban,
  },
  late: {
    label: "Late",
    bgClass: "bg-warning/20",
    textClass: "text-warning",
    icon: Clock,
  },
  arrived: {
    label: "Arrived",
    bgClass: "bg-success/20",
    textClass: "text-success",
    icon: CheckCircle,
  },
  safe: {
    label: "Safe",
    bgClass: "bg-success/20",
    textClass: "text-success",
    icon: Shield,
  },
};

export function StatusBadge({
  status,
  className,
  showIcon = true,
  size = "sm",
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as StatusType] || {
    label: status,
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
    icon: Activity,
  };

  const Icon = config.icon;
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-xs gap-1" 
    : "px-3 py-1 text-sm gap-1.5";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium capitalize",
        config.bgClass,
        config.textClass,
        sizeClasses,
        className
      )}
    >
      {showIcon && <Icon className={iconSize} />}
      {config.label}
    </span>
  );
}

/**
 * Simple status dot indicator
 */
export function StatusDot({
  status,
  className,
  pulse = false,
}: {
  status: string;
  className?: string;
  pulse?: boolean;
}) {
  const config = STATUS_CONFIG[status as StatusType];
  const colorClass = config?.textClass || "text-muted-foreground";

  return (
    <span
      className={cn(
        "w-2 h-2 rounded-full inline-block",
        colorClass.replace("text-", "bg-"),
        pulse && "animate-pulse",
        className
      )}
    />
  );
}

export default StatusBadge;

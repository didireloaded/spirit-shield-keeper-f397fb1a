/**
 * TimeAgo Component
 * Display relative time (e.g., "2 hours ago")
 */

import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeAgoProps {
  date: string | Date | null | undefined;
  className?: string;
  prefix?: string;
  suffix?: boolean;
  fallback?: string;
}

/**
 * Display a date as relative time
 */
export function TimeAgo({
  date,
  className,
  prefix,
  suffix = true,
  fallback = "Unknown",
}: TimeAgoProps) {
  if (!date) return <span className={className}>{fallback}</span>;

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return <span className={className}>{fallback}</span>;
  }

  const timeAgo = formatDistanceToNow(dateObj, { addSuffix: suffix });

  return (
    <span className={cn("text-muted-foreground", className)}>
      {prefix && `${prefix} `}
      {timeAgo}
    </span>
  );
}

/**
 * Compact time display for lists
 */
export function TimeAgoCompact({
  date,
  className,
}: {
  date: string | Date | null | undefined;
  className?: string;
}) {
  if (!date) return null;

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return null;

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let display: string;
  if (diffMins < 1) {
    display = "now";
  } else if (diffMins < 60) {
    display = `${diffMins}m`;
  } else if (diffHours < 24) {
    display = `${diffHours}h`;
  } else if (diffDays < 7) {
    display = `${diffDays}d`;
  } else {
    display = dateObj.toLocaleDateString(undefined, { 
      month: "short", 
      day: "numeric" 
    });
  }

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {display}
    </span>
  );
}

export default TimeAgo;

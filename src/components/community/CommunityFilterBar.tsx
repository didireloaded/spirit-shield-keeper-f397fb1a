/**
 * Community Filter Bar
 * Sticky segmented control: All | Panic | Amber | Incidents
 */

import { cn } from "@/lib/utils";
import type { ThreadFilter } from "@/hooks/useCommunityThreads";
import { AlertTriangle, Search, Radio, FileText } from "lucide-react";

interface CommunityFilterBarProps {
  value: ThreadFilter;
  onChange: (filter: ThreadFilter) => void;
  counts?: Record<ThreadFilter, number>;
}

const filters: { key: ThreadFilter; label: string; icon: typeof Radio }[] = [
  { key: "all", label: "All", icon: FileText },
  { key: "panic", label: "Panic", icon: Radio },
  { key: "amber", label: "Amber", icon: Search },
  { key: "incident", label: "Incidents", icon: AlertTriangle },
];

export function CommunityFilterBar({ value, onChange, counts }: CommunityFilterBarProps) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide">
      {filters.map((f) => {
        const isActive = value === f.key;
        const Icon = f.icon;
        const count = counts?.[f.key];
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{f.label}</span>
            {count !== undefined && count > 0 && (
              <span className={cn(
                "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none font-semibold",
                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

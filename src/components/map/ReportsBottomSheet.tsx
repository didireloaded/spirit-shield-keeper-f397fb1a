/**
 * Reports Bottom Sheet
 * Collapsible bottom sheet with 3 snap points and calm empty states
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { formatDistance, distanceInMeters } from "@/lib/geo";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, Loader2 } from "lucide-react";
import { haptics } from "@/lib/haptics";
import type { MapMarker } from "@/hooks/useMapMarkers";

type TabType = "all" | "mine";
type SheetState = "collapsed" | "half" | "expanded";

const statusConfig: Record<string, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  active: { label: "Open", dotColor: "bg-primary", bgColor: "bg-primary/10", textColor: "text-primary" },
  in_progress: { label: "In Progress", dotColor: "bg-warning", bgColor: "bg-warning/10", textColor: "text-warning" },
  resolved: { label: "Resolved", dotColor: "bg-success", bgColor: "bg-success/10", textColor: "text-success" },
};

const typeLabels: Record<string, string> = {
  robbery: "Robbery Report",
  accident: "Accident Report",
  suspicious: "Suspicious Activity",
  assault: "Assault Report",
  kidnapping: "Kidnapping Alert",
  other: "Incident Report",
};

interface ReportsBottomSheetProps {
  reports: MapMarker[];
  userLocation: { lat: number; lng: number } | null;
  userId?: string;
  loading?: boolean;
  onReportClick?: (report: MapMarker) => void;
  onViewAll?: () => void;
  onRefresh?: () => void;
  radiusMiles?: number;
}

export function ReportsBottomSheet({
  reports,
  userLocation,
  userId,
  loading = false,
  onReportClick,
  onViewAll,
  onRefresh,
  radiusMiles = 2,
}: ReportsBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [sheetState, setSheetState] = useState<SheetState>("collapsed");
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredReports = activeTab === "mine" && userId
    ? reports.filter((r) => r.user_id === userId)
    : reports;

  const reportsWithDistance = filteredReports
    .map((report) => {
      const distance = userLocation
        ? distanceInMeters(userLocation.lat, userLocation.lng, report.latitude, report.longitude)
        : null;
      return { ...report, distance };
    })
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  const heights = {
    collapsed: 110,
    half: "40vh",
    expanded: "70vh",
  };

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;

    if (velocity.y < -500) {
      setSheetState("expanded");
    } else if (velocity.y > 500) {
      setSheetState("collapsed");
    } else if (offset.y < -150) {
      setSheetState("expanded");
    } else if (offset.y > 150) {
      setSheetState("collapsed");
    } else if (offset.y < -50 || offset.y > 50) {
      setSheetState("half");
    }
    haptics.light();
  }, []);

  const cycleSheet = () => {
    haptics.light();
    setSheetState((prev) => {
      if (prev === "collapsed") return "half";
      if (prev === "half") return "expanded";
      return "collapsed";
    });
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    haptics.medium();
    await onRefresh();
    setRefreshing(false);
  };

  const formatMeta = (report: MapMarker & { distance: number | null }) => {
    const parts: string[] = [];
    if (report.created_at) {
      parts.push(`${formatDistanceToNow(new Date(report.created_at), { addSuffix: false })} ago`);
    }
    if (report.distance !== null) {
      parts.push(`~${formatDistance(report.distance)} away`);
    }
    return parts.join(" · ");
  };

  const isCollapsed = sheetState === "collapsed";

  const summaryText = loading
    ? "Loading reports..."
    : reports.length === 0
    ? "No reports nearby"
    : `${reports.length} report${reports.length !== 1 ? "s" : ""} within ${radiusMiles} mi`;

  return (
    <motion.div
      className="fixed bottom-[var(--map-bottom-safe)] left-0 right-0 z-[var(--z-map-buttons)]"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.1, bottom: 0.3 }}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        animate={{ height: heights[sheetState] }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="bg-background rounded-t-3xl shadow-2xl flex flex-col overflow-hidden border-t border-border/30"
      >
        {/* Handle */}
        <div onClick={cycleSheet} className="flex justify-center items-center gap-1 py-3 cursor-grab active:cursor-grabbing">
          <motion.div
            className="h-1.5 bg-muted-foreground/30 rounded-full"
            animate={{
              width: sheetState === "collapsed" ? 40 : sheetState === "half" ? 50 : 60,
            }}
          />
        </div>

        {/* Header */}
        <div className="px-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
              {summaryText}
            </span>
            {!isCollapsed && (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isCollapsed && onRefresh && (
              <button onClick={handleRefresh} disabled={refreshing} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <Loader2 className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
              </button>
            )}
            {!isCollapsed && onViewAll && (
              <button onClick={onViewAll} className="text-sm text-primary hover:text-primary/80 transition-colors">
                View All →
              </button>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              {/* Tabs */}
              <div className="px-5 flex gap-2 pb-3">
                {(["all", "mine"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      haptics.light();
                      setActiveTab(tab);
                    }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {tab === "all" ? "All" : "My Reports"}
                  </button>
                ))}
              </div>

              {/* List */}
              <div ref={listRef} className="px-5 pb-6 space-y-3 overflow-y-auto flex-1">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))
                ) : reportsWithDistance.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground text-sm">
                      {activeTab === "mine" ? "You haven't submitted any reports yet" : "No reports in this area"}
                    </p>
                  </div>
                ) : (
                  reportsWithDistance.map((report) => {
                    const status = statusConfig[report.status || "active"] || statusConfig.active;
                    return (
                      <motion.button
                        key={report.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          haptics.light();
                          onReportClick?.(report);
                        }}
                        className="w-full bg-card rounded-xl border border-border shadow-sm p-4 text-left hover:border-border/80 transition-colors"
                      >
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.textColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                          {status.label}
                        </span>
                        <h3 className="mt-2 font-medium text-foreground text-sm">
                          {typeLabels[report.type] || "Incident Report"}
                        </h3>
                        {report.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{report.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground/80 mt-2">{formatMeta(report)}</p>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default ReportsBottomSheet;

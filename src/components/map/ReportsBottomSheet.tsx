/**
 * Reports Bottom Sheet
 * CityVoice-style report list at bottom of map
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { formatDistance, distanceInMeters } from "@/lib/geo";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapMarker } from "@/hooks/useMapMarkers";

type TabType = "all" | "mine";

// Status configuration for display
const statusConfig: Record<string, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  active: { label: "Open", dotColor: "bg-primary", bgColor: "bg-primary/10", textColor: "text-primary" },
  in_progress: { label: "In Progress", dotColor: "bg-warning", bgColor: "bg-warning/10", textColor: "text-warning" },
  resolved: { label: "Resolved", dotColor: "bg-success", bgColor: "bg-success/10", textColor: "text-success" },
};

// Type labels for display
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
  radiusMiles?: number;
}

export function ReportsBottomSheet({
  reports,
  userLocation,
  userId,
  loading = false,
  onReportClick,
  onViewAll,
  radiusMiles = 2,
}: ReportsBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter reports based on tab
  const filteredReports = activeTab === "mine" && userId
    ? reports.filter((r) => r.user_id === userId)
    : reports;

  // Calculate distance for each report
  const reportsWithDistance = filteredReports.map((report) => {
    const distance = userLocation
      ? distanceInMeters(userLocation.lat, userLocation.lng, report.latitude, report.longitude)
      : null;
    return { ...report, distance };
  }).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.velocity.y < -500 || info.offset.y < -100) {
      setIsExpanded(true);
    } else if (info.velocity.y > 500 || info.offset.y > 100) {
      setIsExpanded(false);
    }
  }, []);

  const formatMeta = (report: MapMarker & { distance: number | null }) => {
    const parts: string[] = [];
    
    if (report.created_at) {
      parts.push(`Submitted ${formatDistanceToNow(new Date(report.created_at), { addSuffix: false })} ago`);
    }
    
    if (report.distance !== null) {
      parts.push(`~${formatDistance(report.distance)} away`);
    }
    
    return parts.join(" · ");
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-20"
      initial={{ y: 0 }}
      animate={{ y: 0 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.1, bottom: 0.3 }}
      onDragEnd={handleDragEnd}
    >
      <div 
        className={`bg-background rounded-t-3xl shadow-xl flex flex-col transition-all duration-300 ${
          isExpanded ? "max-h-[75vh]" : "max-h-[55vh]"
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center py-2 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <p className="font-medium text-foreground">
            {reports.length} Reports Within {radiusMiles} Mi
          </p>

          {onViewAll && (
            <button 
              onClick={onViewAll}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View All →
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="px-5 flex gap-2 pb-3">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("mine")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === "mine"
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            My Reports
          </button>
        </div>

        {/* List */}
        <div className="px-5 pb-6 space-y-3 overflow-y-auto flex-1">
          {loading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : reportsWithDistance.length === 0 ? (
            // Empty state
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                {activeTab === "mine" ? "You haven't submitted any reports yet" : "No reports in this area"}
              </p>
            </div>
          ) : (
            // Report cards
            reportsWithDistance.map((report) => {
              const status = statusConfig[report.status || "active"] || statusConfig.active;
              
              return (
                <motion.button
                  key={report.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onReportClick?.(report)}
                  className="w-full bg-card rounded-xl border border-border shadow-sm p-4 text-left hover:border-border/80 transition-colors"
                >
                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.textColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                    {status.label}
                  </span>

                  {/* Title */}
                  <h3 className="mt-2 font-medium text-foreground">
                    {typeLabels[report.type] || "Incident Report"}
                  </h3>

                  {/* Description preview */}
                  {report.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {report.description}
                    </p>
                  )}

                  {/* Meta info */}
                  <p className="text-sm text-muted-foreground/80 mt-2">
                    {formatMeta(report)}
                  </p>
                </motion.button>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ReportsBottomSheet;

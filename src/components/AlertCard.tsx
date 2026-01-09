import { motion } from "framer-motion";
import { AlertTriangle, MapPin, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type AlertType = "panic" | "amber" | "robbery" | "suspicious" | "assault" | "accident" | "other" | "safe";
export type AlertStatus = "active" | "resolved" | "cancelled" | "escalated";

interface AlertCardProps {
  type: AlertType;
  title: string;
  location: string;
  time: string;
  distance?: string;
  status?: AlertStatus;
  isNew?: boolean;
  onClick?: () => void;
}

const alertStyles: Record<AlertType, { bg: string; icon: string; label: string; urgency: "high" | "medium" | "low" }> = {
  panic: {
    bg: "bg-destructive/10 border-destructive/50",
    icon: "bg-destructive text-destructive-foreground",
    label: "Panic",
    urgency: "high",
  },
  amber: {
    bg: "bg-warning/10 border-warning/50",
    icon: "bg-warning text-warning-foreground",
    label: "Amber Alert",
    urgency: "high",
  },
  robbery: {
    bg: "bg-destructive/10 border-destructive/30",
    icon: "bg-destructive text-destructive-foreground",
    label: "Robbery",
    urgency: "high",
  },
  assault: {
    bg: "bg-destructive/10 border-destructive/30",
    icon: "bg-destructive text-destructive-foreground",
    label: "Assault",
    urgency: "high",
  },
  suspicious: {
    bg: "bg-warning/10 border-warning/30",
    icon: "bg-warning text-warning-foreground",
    label: "Suspicious",
    urgency: "medium",
  },
  accident: {
    bg: "bg-warning/10 border-warning/30",
    icon: "bg-warning text-warning-foreground",
    label: "Accident",
    urgency: "medium",
  },
  other: {
    bg: "bg-secondary border-border",
    icon: "bg-secondary text-secondary-foreground",
    label: "Other",
    urgency: "low",
  },
  safe: {
    bg: "bg-success/10 border-success/30",
    icon: "bg-success text-success-foreground",
    label: "All Clear",
    urgency: "low",
  },
};

const statusConfig: Record<AlertStatus, { label: string; bg: string; text: string }> = {
  active: { label: "Active", bg: "bg-destructive", text: "text-destructive-foreground" },
  resolved: { label: "Resolved", bg: "bg-success", text: "text-success-foreground" },
  cancelled: { label: "Cancelled", bg: "bg-muted", text: "text-muted-foreground" },
  escalated: { label: "Escalated", bg: "bg-destructive", text: "text-destructive-foreground" },
};

export const AlertCard = ({
  type,
  title,
  location,
  time,
  distance,
  status = "active",
  isNew,
  onClick,
}: AlertCardProps) => {
  const style = alertStyles[type] || alertStyles.other;
  const statusStyle = statusConfig[status] || statusConfig.active;
  const isHighUrgency = style.urgency === "high";

  // Parse time to show relative format
  const getRelativeTime = () => {
    try {
      const date = new Date(time);
      return formatDistanceToNow(date, { addSuffix: false });
    } catch {
      return time;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border-2 cursor-pointer
        transition-all duration-200
        ${style.bg}
        ${isHighUrgency && status === "active" ? "shadow-lg" : ""}
      `}
    >
      {/* Status Badge */}
      <span className={`absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
        {statusStyle.label}
      </span>

      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg ${style.icon} ${isHighUrgency && status === "active" ? "animate-pulse" : ""}`}>
          <AlertTriangle className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-16">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {style.label}
            </span>
          </div>

          <h3 className="font-semibold text-foreground text-sm line-clamp-2">{title}</h3>

          {/* Distance - Made more prominent */}
          {distance && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-primary">{distance}</span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate text-xs">{location}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{getRelativeTime()} ago</span>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </motion.div>
  );
};

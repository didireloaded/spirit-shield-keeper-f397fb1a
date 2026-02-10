import { motion } from "framer-motion";
import { AlertTriangle, Search, MapPin, Clock, ChevronRight } from "lucide-react";

export type AlertType = "panic" | "amber" | "robbery" | "suspicious" | "assault" | "accident" | "other" | "safe";

interface AlertCardProps {
  type: AlertType;
  title: string;
  location: string;
  time: string;
  distance?: string;
  isNew?: boolean;
}

const alertStyles: Record<AlertType, { bg: string; icon: string; label: string }> = {
  panic: {
    bg: "bg-destructive/10 border-destructive/30",
    icon: "bg-destructive text-destructive-foreground",
    label: "Panic",
  },
  amber: {
    bg: "bg-warning/10 border-warning/30",
    icon: "bg-warning text-warning-foreground",
    label: "Amber Alert",
  },
  robbery: {
    bg: "bg-destructive/10 border-destructive/30",
    icon: "bg-destructive text-destructive-foreground",
    label: "Robbery",
  },
  suspicious: {
    bg: "bg-warning/10 border-warning/30",
    icon: "bg-warning text-warning-foreground",
    label: "Suspicious",
  },
  assault: {
    bg: "bg-destructive/10 border-destructive/30",
    icon: "bg-destructive text-destructive-foreground",
    label: "Assault",
  },
  accident: {
    bg: "bg-warning/10 border-warning/30",
    icon: "bg-warning text-warning-foreground",
    label: "Accident",
  },
  other: {
    bg: "bg-secondary border-border",
    icon: "bg-secondary text-secondary-foreground",
    label: "Other",
  },
  safe: {
    bg: "bg-success/10 border-success/30",
    icon: "bg-success text-success-foreground",
    label: "All Clear",
  },
};

export const AlertCard = ({
  type,
  title,
  location,
  time,
  distance,
  isNew,
}: AlertCardProps) => {
  const style = alertStyles[type] || alertStyles.other;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 4 }}
      className={`
        relative p-4 rounded-xl border cursor-pointer
        transition-all duration-200
        ${style.bg}
      `}
    >
      {isNew && (
        <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold uppercase bg-panic text-destructive-foreground rounded-full">
          Active
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${style.icon}`}>
          {type === "amber" ? <Search className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {style.label}
            </span>
          </div>

          <h3 className="font-semibold text-foreground text-sm line-clamp-2">{title}</h3>

          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate text-xs">{location}</span>
            </div>
            {distance && (
              <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                {distance}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{time}</span>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </div>
    </motion.div>
  );
};

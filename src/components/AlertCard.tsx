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

const alertStyles: Record<AlertType, { bg: string; icon: string; stripe: string; label: string }> = {
  panic: {
    bg: "bg-destructive/5 border-border/50",
    icon: "bg-destructive/15 text-destructive",
    stripe: "bg-destructive",
    label: "Panic",
  },
  amber: {
    bg: "bg-warning/5 border-border/50",
    icon: "bg-warning/15 text-warning",
    stripe: "bg-warning",
    label: "Amber Alert",
  },
  robbery: {
    bg: "bg-destructive/5 border-border/50",
    icon: "bg-destructive/15 text-destructive",
    stripe: "bg-destructive",
    label: "Robbery",
  },
  suspicious: {
    bg: "bg-warning/5 border-border/50",
    icon: "bg-warning/15 text-warning",
    stripe: "bg-warning",
    label: "Suspicious",
  },
  assault: {
    bg: "bg-destructive/5 border-border/50",
    icon: "bg-destructive/15 text-destructive",
    stripe: "bg-destructive",
    label: "Assault",
  },
  accident: {
    bg: "bg-orange-500/5 border-border/50",
    icon: "bg-orange-500/15 text-orange-400",
    stripe: "bg-orange-500",
    label: "Accident",
  },
  other: {
    bg: "bg-secondary border-border/50",
    icon: "bg-secondary text-secondary-foreground",
    stripe: "bg-muted-foreground",
    label: "Other",
  },
  safe: {
    bg: "bg-success/5 border-border/50",
    icon: "bg-success/15 text-success",
    stripe: "bg-success",
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
      className={`relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-200 ${style.bg}`}
    >
      {/* Left accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.stripe}`} />

      <div className="flex items-start gap-3 p-4 pl-5">
        <div className={`p-2 rounded-xl ${style.icon}`}>
          {type === "amber" ? <Search className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {style.label}
            </span>
            {isNew && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-panic text-destructive-foreground rounded-full">
                Active
              </span>
            )}
          </div>

          <h3 className="font-semibold text-foreground text-sm font-display line-clamp-2">{title}</h3>

          <div className="flex items-center gap-3 mt-2 text-muted-foreground">
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

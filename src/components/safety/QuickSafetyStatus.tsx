/**
 * Quick Safety Status Component
 * Lightweight UI to broadcast "I'm safe" / "I need help" / "On my way"
 * Extension-only — does not modify existing components
 */

import { motion } from "framer-motion";
import { Shield, AlertTriangle, Navigation, X } from "lucide-react";
import { useQuickSafetyStatus, SafetyStatusType } from "@/hooks/useQuickSafetyStatus";

const statusOptions: { type: SafetyStatusType; label: string; icon: typeof Shield; color: string; bg: string }[] = [
  { type: "safe", label: "I'm Safe", icon: Shield, color: "text-success", bg: "bg-success/10 hover:bg-success/20" },
  { type: "need_help", label: "Need Help", icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10 hover:bg-warning/20" },
  { type: "on_my_way", label: "On My Way", icon: Navigation, color: "text-primary", bg: "bg-primary/10 hover:bg-primary/20" },
];

export function QuickSafetyStatus() {
  const { currentStatus, loading, sendStatus, clearStatus } = useQuickSafetyStatus();

  if (currentStatus) {
    const active = statusOptions.find(o => o.type === currentStatus.status);
    const Icon = active?.icon || Shield;
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center justify-between p-3 rounded-xl border border-border ${active?.bg || "bg-card"}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${active?.color}`} />
          <span className="text-sm font-medium">{active?.label}</span>
          <span className="text-xs text-muted-foreground">· shared with your circle</span>
        </div>
        <button onClick={clearStatus} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium px-1">Quick Status</p>
      <div className="grid grid-cols-3 gap-2">
        {statusOptions.map((opt, i) => {
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={loading}
              onClick={() => sendStatus(opt.type)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${opt.bg} transition-colors`}
            >
              <Icon className={`w-5 h-5 ${opt.color}`} />
              <span className="text-xs font-medium">{opt.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

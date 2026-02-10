/**
 * Incident Credibility Badge & Actions
 * Shows verification status and lets users confirm/deny
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ShieldQuestion, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { useIncidentCredibility } from "@/hooks/useIncidentCredibility";

interface Props {
  incidentId: string;
  incidentType: "marker" | "incident_report";
  compact?: boolean;
}

export function CredibilityBadge({ incidentId, incidentType, compact = false }: Props) {
  const {
    confirmCount,
    denyCount,
    credibilityScore,
    userAction,
    submitVerification,
    fetchVerifications,
  } = useIncidentCredibility(incidentId, incidentType);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  const total = confirmCount + denyCount;
  const status = total === 0 ? "unconfirmed" : credibilityScore >= 70 ? "verified" : credibilityScore <= 30 ? "disputed" : "unconfirmed";

  const statusConfig = {
    verified: { icon: ShieldCheck, color: "text-success", bg: "bg-success/10", label: "Verified" },
    disputed: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10", label: "Disputed" },
    unconfirmed: { icon: ShieldQuestion, color: "text-muted-foreground", bg: "bg-secondary", label: "Unconfirmed" },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
        {total > 0 && <span className="opacity-70">({total})</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        {total > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {confirmCount} confirmed · {denyCount} denied
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => submitVerification("confirm")}
          disabled={userAction === "confirm"}
          className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            userAction === "confirm"
              ? "bg-success/20 text-success"
              : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          Confirm
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => submitVerification("deny")}
          disabled={userAction === "deny"}
          className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            userAction === "deny"
              ? "bg-destructive/20 text-destructive"
              : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          False Report
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => submitVerification("add_info")}
          className="py-2 px-3 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-muted-foreground"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </div>
  );
}

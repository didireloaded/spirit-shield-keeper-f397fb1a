/**
 * Authority Escalation Modal
 * Allows users to escalate incidents to authorities/security
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Users, Building, X } from "lucide-react";
import { useEscalation, type EscalationTarget } from "@/hooks/useEscalation";

interface Props {
  visible: boolean;
  entityId: string;
  entityType: "panic_session" | "incident_report" | "marker";
  onClose: () => void;
}

const targets: { id: EscalationTarget; icon: typeof Shield; label: string; description: string }[] = [
  { id: "local_authority", icon: Building, label: "Local Authority", description: "Police, fire, or medical services" },
  { id: "private_security", icon: Shield, label: "Private Security", description: "Nearby security companies" },
  { id: "community_leader", icon: Users, label: "Community Leader", description: "Trusted community representatives" },
];

export function EscalationModal({ visible, entityId, entityType, onClose }: Props) {
  const { escalate, loading } = useEscalation();
  const [selectedTarget, setSelectedTarget] = useState<EscalationTarget | null>(null);
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    if (!selectedTarget) return;
    await escalate(entityId, entityType, selectedTarget, reason);
    onClose();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Escalate Incident
              </h2>
              <button onClick={onClose} className="p-2 rounded-full bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Choose who should be notified about this incident
            </p>

            <div className="space-y-2">
              {targets.map(target => {
                const Icon = target.icon;
                return (
                  <button
                    key={target.id}
                    onClick={() => setSelectedTarget(target.id)}
                    className={`w-full p-3 rounded-xl text-left transition-colors flex items-center gap-3 ${
                      selectedTarget === target.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-secondary hover:bg-secondary/80 border-2 border-transparent"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${selectedTarget === target.id ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-medium text-sm">{target.label}</p>
                      <p className="text-xs text-muted-foreground">{target.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Additional details (optional)"
              className="w-full px-3 py-2 bg-secondary rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={2}
            />

            <button
              onClick={handleSubmit}
              disabled={!selectedTarget || loading}
              className="w-full py-3 bg-warning text-warning-foreground rounded-xl font-semibold disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Escalation"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

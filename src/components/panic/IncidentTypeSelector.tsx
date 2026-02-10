import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IncidentType {
  id: string;
  category: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  requires_recording: boolean | null;
  auto_notify_authorities: boolean | null;
}

interface Props {
  onSelect: (incident: IncidentType) => void;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  panic: "🚨 Panic",
  amber: "🟠 Amber Alert",
  break_in: "🏠 Break-In",
  medical: "🏥 Medical",
  fire: "🔥 Fire",
};

export function IncidentTypeSelector({ onSelect, onClose }: Props) {
  const [incidents, setIncidents] = useState<IncidentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("incident_types")
        .select("*")
        .order("category");
      if (data) setIncidents(data as IncidentType[]);
      setLoading(false);
    };
    load();
  }, []);

  const grouped = incidents.reduce((acc, incident) => {
    if (!acc[incident.category]) acc[incident.category] = [];
    acc[incident.category].push(incident);
    return acc;
  }, {} as Record<string, IncidentType[]>);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[var(--z-modal)] flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-card rounded-t-3xl p-6 max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Select Emergency Type</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-secondary flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 scrollbar-hide space-y-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            Object.entries(grouped).map(([category, types]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                  {CATEGORY_LABELS[category] || category}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {types.map((incident) => (
                    <motion.button
                      key={incident.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onSelect(incident)}
                      className="p-4 rounded-xl border-2 border-border text-left hover:border-primary transition-all hover:shadow-lg"
                    >
                      <div className="text-3xl mb-2">{incident.icon}</div>
                      <p className="font-medium text-sm">{incident.name}</p>
                      {incident.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {incident.description}
                        </p>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

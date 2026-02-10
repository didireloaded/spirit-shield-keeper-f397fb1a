/**
 * Incident Type Picker
 * Fetches incident_types from DB for categorized map reports
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface IncidentType {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  description: string | null;
}

interface Props {
  selectedType: string;
  onSelect: (type: string, incidentType?: IncidentType) => void;
}

export function IncidentTypePicker({ selectedType, onSelect }: Props) {
  const [types, setTypes] = useState<IncidentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTypes = async () => {
      const { data } = await supabase
        .from("incident_types")
        .select("*")
        .order("category");
      if (data) setTypes(data);
      setLoading(false);
    };
    fetchTypes();
  }, []);

  if (loading || types.length === 0) return null;

  // Group by category
  const grouped = types.reduce<Record<string, IncidentType[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">
        Incident Type <span className="text-destructive">*</span>
      </label>
      <div className="max-h-48 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">{category}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((t) => {
                const isSelected = selectedType === t.name.toLowerCase().replace(/\s+/g, "_");
                return (
                  <motion.button
                    key={t.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onSelect(t.name.toLowerCase().replace(/\s+/g, "_") as string, t)}
                    className={`px-3 py-2 rounded-lg border text-left transition-all text-xs ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{t.icon}</span>
                      <span className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                        {t.name}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

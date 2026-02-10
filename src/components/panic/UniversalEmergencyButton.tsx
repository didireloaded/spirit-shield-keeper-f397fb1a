import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { IncidentTypeSelector } from "./IncidentTypeSelector";
import { PanicActivation } from "./PanicActivation";
import { AmberActivation } from "./AmberActivation";

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

export function UniversalEmergencyButton() {
  const [showSelector, setShowSelector] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentType | null>(null);

  const handleBack = () => setSelectedIncident(null);

  if (selectedIncident) {
    if (selectedIncident.category === "amber") {
      return <AmberActivation incident={selectedIncident} onBack={handleBack} />;
    }
    return <PanicActivation incident={selectedIncident} onBack={handleBack} />;
  }

  return (
    <>
      <button
        onClick={() => setShowSelector(true)}
        className="w-full py-4 bg-card hover:bg-card/80 border-2 border-border rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
      >
        📋 Report Specific Incident Type
      </button>

      <AnimatePresence>
        {showSelector && (
          <IncidentTypeSelector
            onSelect={(incident) => {
              setSelectedIncident(incident);
              setShowSelector(false);
            }}
            onClose={() => setShowSelector(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

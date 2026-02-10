/**
 * Incident Report Modal
 * Modal for reporting new incidents on the map
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IncidentTypePicker } from "@/components/map/IncidentTypePicker";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRateLimit } from "@/hooks/useRateLimit";

type MarkerType = "robbery" | "accident" | "suspicious" | "assault" | "kidnapping" | "other";

interface IncidentReportModalProps {
  visible: boolean;
  location: { lat: number; lng: number } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function LocationDisplay({ lat, lng }: { lat: number; lng: number }) {
  const [name, setName] = useState("Fetching location...");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        if (error || !data?.token) { setName("Location confirmed"); return; }
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,locality,place,address&limit=1&access_token=${data.token}`
        );
        const json = await res.json();
        if (!cancelled) {
          setName(json.features?.[0]?.place_name?.split(",").slice(0, 2).join(", ") || "Location confirmed");
        }
      } catch {
        if (!cancelled) setName("Location confirmed");
      }
    })();
    return () => { cancelled = true; };
  }, [lat, lng]);

  return (
    <div className="bg-secondary/50 rounded-xl p-4 border border-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
          <MapPin className="w-4 h-4 text-success" />
        </div>
        <div>
          <p className="text-sm font-medium text-success">Location confirmed</p>
          <p className="text-xs text-muted-foreground">{name}</p>
        </div>
      </div>
    </div>
  );
}

export function IncidentReportModal({
  visible,
  location,
  onClose,
  onSuccess,
}: IncidentReportModalProps) {
  const [selectedType, setSelectedType] = useState<MarkerType>("robbery");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { checkIncidentLimit } = useRateLimit();

  const handleSubmit = async () => {
    if (!user || !location) return;
    if (!description.trim()) {
      toast.error("Please provide a description");
      return;
    }

    const allowed = await checkIncidentLimit();
    if (!allowed) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("markers")
        .insert({
          user_id: user.id,
          latitude: location.lat,
          longitude: location.lng,
          type: selectedType,
          description: description,
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to report incident");
        console.error(error);
      } else {
        toast.success("Incident reported!");
        setDescription("");
        setSelectedType("robbery");
        onSuccess?.();
        onClose();

        if (data) {
          supabase.functions
            .invoke("send-incident-notification", { body: { marker: data } })
            .catch((err) => console.error("Notification error:", err));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setDescription("");
    setSelectedType("robbery");
    onClose();
  };

  return (
    <AnimatePresence>
      {visible && location && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Report Incident</h2>
                    <p className="text-sm text-muted-foreground">Location selected on map</p>
                  </div>
                </div>
                <button onClick={handleCancel} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-5">
              {/* Location Display — human readable, no coordinates */}
              <LocationDisplay lat={location.lat} lng={location.lng} />

              {/* Incident Type */}
              <IncidentTypePicker
                selectedType={selectedType}
                onSelect={(type) => setSelectedType(type as MarkerType)}
              />

              {/* Description — required */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened..."
                  className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none transition-all"
                  rows={3}
                  style={{ fontSize: "16px" }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-secondary/30 border-t border-border flex gap-3">
              <Button variant="outline" onClick={handleCancel} className="flex-1 h-12 rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !description.trim()}
                className="flex-1 h-12 bg-warning hover:bg-warning/90 text-warning-foreground rounded-xl font-semibold"
              >
                <Check className="w-5 h-5 mr-2" />
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default IncidentReportModal;

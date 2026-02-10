import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, X, Camera, Car, Activity, Clock, Radio, Mic } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { MiniMap } from "@/components/MiniMap";
import { AlertDetailsModal } from "@/components/AlertDetailsModal";
import { AmberAlertDetailsModal } from "@/components/AmberAlertDetailsModal";
import { PanicButton } from "@/components/PanicButton";
import { LivePanicFeed } from "@/components/panic/LivePanicFeed";
import { useAlerts } from "@/hooks/useAlerts";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { useRateLimit } from "@/hooks/useRateLimit";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
}

const Alerts = () => {
  const { alerts, loading, createAlert } = useAlerts();
  const { isRecording } = useAudioRecording();
  const { latitude, longitude } = useGeolocation();
  const { checkAmberLimit } = useRateLimit();
  const { uploading: photoUploading, previewUrl: amberPhotoPreview, selectAndUpload: selectAmberPhoto, photoUrl: amberPhotoUrl, clearPhoto: clearAmberPhoto } = usePhotoUpload({
    bucket: "post-images",
    onSuccess: () => toast.success("Photo uploaded successfully"),
    onError: () => toast.error("Failed to upload photo"),
  });

  const [recordingTime, setRecordingTime] = useState(0);
  const [showAmberForm, setShowAmberForm] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [amberFormData, setAmberFormData] = useState({
    description: "",
    personName: "",
    lastSeenLocation: "",
    outfitDescription: "",
    vehicleMake: "",
    vehicleColor: "",
    vehiclePlate: "",
  });

  // Fetch markers for mini map
  useEffect(() => {
    const fetchMarkers = async () => {
      const { data } = await supabase
        .from("markers")
        .select("id, latitude, longitude, type")
        .gte("expires_at", new Date().toISOString());
      if (data) setMarkers(data);
    };
    fetchMarkers();

    const channel = supabase
      .channel("markers-alerts-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "markers" }, fetchMarkers)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAmberSubmit = useCallback(async () => {
    if (!latitude || !longitude) {
      toast.error("Unable to get your location. Please enable GPS.");
      return;
    }
    if (!amberFormData.description) {
      toast.error("Please provide a description.");
      return;
    }

    const allowed = await checkAmberLimit();
    if (!allowed) return;

    const description = [
      amberFormData.personName && `Name: ${amberFormData.personName}`,
      amberFormData.description,
      amberFormData.lastSeenLocation && `Last seen: ${amberFormData.lastSeenLocation}`,
      amberFormData.outfitDescription && `Outfit: ${amberFormData.outfitDescription}`,
      amberFormData.vehicleMake && `Vehicle: ${amberFormData.vehicleMake}`,
      amberFormData.vehicleColor && `Color: ${amberFormData.vehicleColor}`,
      amberFormData.vehiclePlate && `Plate: ${amberFormData.vehiclePlate}`,
      amberPhotoUrl && `Photo: ${amberPhotoUrl}`,
    ]
      .filter(Boolean)
      .join(". ");

    // Create amber alert — NO recording, NO map markers
    const { data, error } = await createAlert("amber", latitude, longitude, description);

    if (error) {
      toast.error("Failed to create alert");
      return;
    }

    if (data) {
      toast.success("🟠 AMBER alert issued! Posted to Community.");
      setShowAmberForm(false);
      setAmberFormData({
        description: "",
        personName: "",
        lastSeenLocation: "",
        outfitDescription: "",
        vehicleMake: "",
        vehicleColor: "",
        vehiclePlate: "",
      });
      clearAmberPhoto();
    }
  }, [latitude, longitude, amberFormData, amberPhotoUrl, createAlert, clearAmberPhoto, checkAmberLimit]);

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const userLocation = latitude && longitude ? { latitude, longitude } : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Community Alerts</h1>
          <p className="text-sm text-muted-foreground">Stay informed about incidents in your area</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-4 text-center">
            <Activity className="w-6 h-6 mx-auto mb-2 text-success" />
            <p className="text-xl font-bold">{activeAlerts.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xl font-bold">24h</p>
            <p className="text-xs text-muted-foreground">Recent</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center">
            <Radio className="w-6 h-6 mx-auto mb-2 text-warning" />
            <p className="text-xl font-bold">Live</p>
            <p className="text-xs text-muted-foreground">Updates</p>
          </div>
        </div>

        {/* Side-by-Side Panic & Amber Buttons — single tap only */}
        <div className="flex items-center justify-center gap-8">
          <PanicButton variant="panic" />
          <PanicButton variant="amber" onAmberTap={() => setShowAmberForm(true)} />
        </div>

        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Mic className="w-5 h-5 text-destructive animate-pulse" />
                <div>
                  <p className="font-semibold text-destructive text-sm">Recording Active</p>
                  <p className="text-xs text-muted-foreground">Audio evidence being captured</p>
                </div>
              </div>
              <span className="font-mono text-destructive font-bold">{formatTime(recordingTime)}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Panic Feed */}
        <section>
          <h2 className="text-lg font-semibold mb-3">🔴 Live Emergency Alerts</h2>
          <LivePanicFeed />
        </section>

        {/* Mini Map */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Live Incidents</h2>
          <MiniMap
            markers={markers}
            alerts={activeAlerts}
            userLocation={userLocation}
            className="w-full h-48"
          />
        </section>

        {/* Alert Types Legend */}
        <div className="bg-card rounded-xl p-4">
          <h3 className="font-semibold mb-3">Alert Types</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-destructive" />
              <span>Panic / Assault</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-warning" />
              <span>Amber / Missing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Robbery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Accident</span>
            </div>
          </div>
        </div>

        {/* Amber Alert Form Modal */}
        <AnimatePresence>
          {showAmberForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-end"
              onClick={() => setShowAmberForm(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-card rounded-t-3xl flex flex-col max-h-[85vh]"
              >
                {/* Header — fixed */}
                <div className="flex items-center justify-between p-6 pb-3 shrink-0">
                  <h2 className="text-xl font-bold text-warning">🟡 Amber Alert</h2>
                  <button
                    onClick={() => setShowAmberForm(false)}
                    className="p-2 rounded-full bg-secondary hover:bg-secondary/80"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable form body */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Missing Person Name</label>
                    <input
                      type="text"
                      placeholder="Full name of missing person"
                      value={amberFormData.personName}
                      onChange={(e) => setAmberFormData({ ...amberFormData, personName: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-warning/50"
                      style={{ fontSize: "16px" }}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Description of Situation *</label>
                    <textarea
                      placeholder="Describe the person and circumstances..."
                      value={amberFormData.description}
                      onChange={(e) => setAmberFormData({ ...amberFormData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-warning/50"
                      rows={3}
                      style={{ fontSize: "16px" }}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Last Seen Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Sandton City Mall, near entrance"
                      value={amberFormData.lastSeenLocation}
                      onChange={(e) => setAmberFormData({ ...amberFormData, lastSeenLocation: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-warning/50"
                      style={{ fontSize: "16px" }}
                    />
                  </div>

                  {amberPhotoPreview ? (
                    <div className="relative">
                      <img src={amberPhotoPreview} alt="Amber alert photo" className="w-full h-48 object-cover rounded-xl" />
                      <button onClick={clearAmberPhoto} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors">
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={selectAmberPhoto}
                      disabled={photoUploading}
                      className="w-full py-4 bg-secondary hover:bg-secondary/80 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border-2 border-dashed border-border"
                    >
                      {photoUploading ? (
                        <div className="w-6 h-6 border-2 border-warning border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm font-medium">Upload Photo (optional)</span>
                        </>
                      )}
                    </button>
                  )}

                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Outfit Description</label>
                    <input
                      type="text"
                      placeholder="What are they wearing?"
                      value={amberFormData.outfitDescription}
                      onChange={(e) => setAmberFormData({ ...amberFormData, outfitDescription: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-warning/50"
                      style={{ fontSize: "16px" }}
                    />
                  </div>

                  <div className="p-4 bg-secondary/50 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Car className="w-4 h-4" />
                      <span>Vehicle Details (if applicable)</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Make & Model"
                      value={amberFormData.vehicleMake}
                      onChange={(e) => setAmberFormData({ ...amberFormData, vehicleMake: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-warning/50"
                      style={{ fontSize: "16px" }}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Color"
                        value={amberFormData.vehicleColor}
                        onChange={(e) => setAmberFormData({ ...amberFormData, vehicleColor: e.target.value })}
                        className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-warning/50"
                        style={{ fontSize: "16px" }}
                      />
                      <input
                        type="text"
                        placeholder="License Plate"
                        value={amberFormData.vehiclePlate}
                        onChange={(e) => setAmberFormData({ ...amberFormData, vehiclePlate: e.target.value })}
                        className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-warning/50"
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sticky submit button — always visible */}
                <div className="shrink-0 p-6 pt-3 border-t border-border bg-card">
                  <button
                    onClick={handleAmberSubmit}
                    disabled={!amberFormData.description}
                    className="w-full py-4 bg-warning hover:bg-warning/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-warning-foreground transition-colors text-base"
                  >
                    🟡 Broadcast Amber Alert
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alert Details Modal */}
        <AnimatePresence>
          {selectedAlert && selectedAlert.type === "amber" ? (
            <AmberAlertDetailsModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} userLocation={userLocation} />
          ) : selectedAlert ? (
            <AlertDetailsModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} userLocation={userLocation} />
          ) : null}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
};

export default Alerts;

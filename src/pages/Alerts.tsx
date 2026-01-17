import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Mic, X, Camera, Car, Activity, Clock, Radio, ChevronDown, Lightbulb, MapPinOff } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { MiniMap } from "@/components/MiniMap";
import { AlertDetailsModal } from "@/components/AlertDetailsModal";
import { AmberAlertDetailsModal } from "@/components/AmberAlertDetailsModal";
import { EmptyState } from "@/components/EmptyState";
import { useAlerts } from "@/hooks/useAlerts";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { useRateLimit } from "@/hooks/useRateLimit";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
}

const Alerts = () => {
  const { alerts, loading, createAlert } = useAlerts();
  const { isRecording, startRecording, stopRecording } = useAudioRecording();
  const { latitude, longitude, error: locationError } = useGeolocation();
  const { checkSOSLimit, checkAmberLimit, checking: rateLimitChecking } = useRateLimit();
  const { uploading: photoUploading, previewUrl: amberPhotoPreview, selectAndUpload: selectAmberPhoto, photoUrl: amberPhotoUrl, clearPhoto: clearAmberPhoto } = usePhotoUpload({
    bucket: "post-images",
    onSuccess: () => toast.success("Photo uploaded successfully"),
    onError: () => toast.error("Failed to upload photo"),
  });
  
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [showAmberForm, setShowAmberForm] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [amberFormData, setAmberFormData] = useState({
    description: "",
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePanicPress = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      await stopRecording();
      toast.success("Recording saved. Alert sent to authorities.");
      setActiveAlertId(null);
      return;
    }

    // Start recording and create alert
    if (!latitude || !longitude) {
      toast.error("Unable to get your location. Please enable GPS.");
      return;
    }

    // Check rate limit before allowing SOS
    const allowed = await checkSOSLimit();
    if (!allowed) return;

    await startRecording();
    const { data, error } = await createAlert("panic", latitude, longitude, "Panic alert triggered");

    if (error) {
      toast.error("Failed to create alert");
      return;
    }

    if (data) {
      setActiveAlertId(data.id);
      toast.success("🚨 PANIC alert activated! Recording audio...");
    }
  }, [isRecording, latitude, longitude, startRecording, stopRecording, createAlert, checkSOSLimit]);

  const handleAmberSubmit = useCallback(async () => {
    if (!latitude || !longitude) {
      toast.error("Unable to get your location. Please enable GPS.");
      return;
    }

    // Check rate limit for Amber alerts
    const allowed = await checkAmberLimit();
    if (!allowed) return;

    const description = [
      amberFormData.description,
      amberFormData.outfitDescription && `Outfit: ${amberFormData.outfitDescription}`,
      amberFormData.vehicleMake && `Vehicle: ${amberFormData.vehicleMake}`,
      amberFormData.vehicleColor && `Color: ${amberFormData.vehicleColor}`,
      amberFormData.vehiclePlate && `Plate: ${amberFormData.vehiclePlate}`,
      amberPhotoUrl && `Photo: ${amberPhotoUrl}`,
    ]
      .filter(Boolean)
      .join(". ");

    await startRecording();
    const { data, error } = await createAlert("amber", latitude, longitude, description);

    if (error) {
      toast.error("Failed to create alert");
      return;
    }

    if (data) {
      setActiveAlertId(data.id);
      toast.success("🟠 AMBER alert activated! Notifying authorities...");
      setShowAmberForm(false);
      setAmberFormData({
        description: "",
        outfitDescription: "",
        vehicleMake: "",
        vehicleColor: "",
        vehiclePlate: "",
      });
      clearAmberPhoto();
    }
  }, [latitude, longitude, amberFormData, amberPhotoUrl, startRecording, createAlert, clearAmberPhoto, checkAmberLimit]);

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const userLocation = latitude && longitude ? { latitude, longitude } : null;

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const [alertsExpanded, setAlertsExpanded] = useState(true);

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

        {/* Emergency Buttons - Side by Side Circles */}
        <div className="flex justify-center gap-6">
          {/* Panic Button - Circle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePanicPress}
            className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all ${
              isRecording
                ? "bg-destructive shadow-panic"
                : "bg-destructive hover:bg-destructive/90 panic-pulse"
            }`}
          >
            {isRecording ? (
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 bg-white rounded-full recording-pulse mb-2" />
                <Mic className="w-6 h-6 text-white mb-1" />
                <span className="text-lg font-mono font-bold text-white">{formatTime(recordingTime)}</span>
                <span className="text-[10px] text-white/80 mt-1">Tap to stop</span>
              </div>
            ) : (
              <>
                <Shield className="w-10 h-10 text-white mb-1" />
                <span className="text-base font-bold text-white">PANIC</span>
              </>
            )}
          </motion.button>

          {/* Amber Alert Button - Circle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAmberForm(true)}
            className="w-32 h-32 rounded-full bg-warning hover:bg-warning/90 flex flex-col items-center justify-center transition-all"
          >
            <AlertTriangle className="w-10 h-10 text-warning-foreground mb-1" />
            <span className="text-base font-bold text-warning-foreground">AMBER</span>
          </motion.button>
        </div>

        {/* Collapsible Critical Alerts */}
        <Collapsible open={alertsExpanded} onOpenChange={setAlertsExpanded}>
          <CollapsibleTrigger className="flex items-center justify-between w-full bg-card rounded-xl p-4 hover:bg-card/80 transition-colors">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="font-semibold">Critical Alerts</span>
              <span className="bg-secondary text-xs px-2 py-0.5 rounded-full">{activeAlerts.length}</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${alertsExpanded ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />
                ))}
              </div>
            ) : activeAlerts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {activeAlerts.map((alert, index) => {
                  const dist = userLocation
                    ? calculateDistance(userLocation.latitude, userLocation.longitude, alert.latitude, alert.longitude)
                    : null;

                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-xl p-4"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                          alert.type === "panic"
                            ? "bg-destructive"
                            : alert.type === "amber"
                            ? "bg-warning"
                            : "bg-primary"
                        }`}
                      >
                        <AlertTriangle
                          className={`w-5 h-5 ${
                            alert.type === "amber" ? "text-warning-foreground" : "text-white"
                          }`}
                        />
                      </div>
                      <h3 className="font-semibold capitalize text-sm">{alert.type} Alert</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at!), { addSuffix: true })}
                      </p>
                      {dist !== null && (
                        <p className="text-xs text-primary mt-1">{dist.toFixed(1)} km away</p>
                      )}
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="w-full mt-2 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-xs font-medium transition-colors"
                      >
                        View Details
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-card rounded-xl">
                <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center mb-3">
                  <Shield className="w-8 h-8 text-success" />
                </div>
                <p className="font-medium">All Clear</p>
                <p className="text-sm text-muted-foreground mt-1">No active alerts in your area</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Alert Safety Tips */}
        <div className="bg-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-warning" />
            <span className="font-semibold">Alert Safety Tips</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Stay aware of alerts in your area</li>
            <li>• Report suspicious activities immediately</li>
            <li>• Share alerts with your emergency contacts</li>
            <li>• Use the map to see alert locations</li>
          </ul>
        </div>

        {/* Alert Types Legend */}
        <div className="bg-card rounded-xl p-4">
          <h3 className="font-semibold mb-3">Alert Types</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-destructive" />
              <span>Panic/Assault</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-warning" />
              <span>Amber/Kidnapping</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Robbery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Accident</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-500" />
              <span>Suspicious</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600" />
              <span>Fire</span>
            </div>
          </div>
        </div>

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
                className="w-full bg-card rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Amber Alert Details</h2>
                  <button
                    onClick={() => setShowAmberForm(false)}
                    className="p-2 rounded-full bg-secondary hover:bg-secondary/80"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Description */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Description *</label>
                    <textarea
                      placeholder="Describe the missing person..."
                      value={amberFormData.description}
                      onChange={(e) => setAmberFormData({ ...amberFormData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-warning/50"
                      rows={3}
                    />
                  </div>

                  {/* Photo Upload */}
                  {amberPhotoPreview ? (
                    <div className="relative">
                      <img
                        src={amberPhotoPreview}
                        alt="Amber alert photo"
                        className="w-full h-48 object-cover rounded-xl"
                      />
                      <button
                        onClick={clearAmberPhoto}
                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                      >
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
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm font-medium">Upload Photo of Missing Person</span>
                          <span className="text-xs text-muted-foreground">Tap to take or select photo</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Outfit */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Outfit Description</label>
                    <input
                      type="text"
                      placeholder="What are they wearing?"
                      value={amberFormData.outfitDescription}
                      onChange={(e) => setAmberFormData({ ...amberFormData, outfitDescription: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-warning/50"
                    />
                  </div>

                  {/* Vehicle Details */}
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
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Color"
                        value={amberFormData.vehicleColor}
                        onChange={(e) => setAmberFormData({ ...amberFormData, vehicleColor: e.target.value })}
                        className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-warning/50"
                      />
                      <input
                        type="text"
                        placeholder="License Plate"
                        value={amberFormData.vehiclePlate}
                        onChange={(e) => setAmberFormData({ ...amberFormData, vehiclePlate: e.target.value })}
                        className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-warning/50"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleAmberSubmit}
                    disabled={!amberFormData.description}
                    className="w-full py-4 bg-warning hover:bg-warning/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-warning-foreground transition-colors"
                  >
                    🚨 Broadcast Amber Alert
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alert Details Modal - Use AmberAlertDetailsModal for amber alerts */}
        <AnimatePresence>
          {selectedAlert && selectedAlert.type === "amber" ? (
            <AmberAlertDetailsModal
              alert={selectedAlert}
              onClose={() => setSelectedAlert(null)}
              userLocation={userLocation}
            />
          ) : selectedAlert ? (
            <AlertDetailsModal
              alert={selectedAlert}
              onClose={() => setSelectedAlert(null)}
              userLocation={userLocation}
            />
          ) : null}
        </AnimatePresence>

      </main>

      <BottomNav />
    </div>
  );
};

export default Alerts;

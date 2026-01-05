import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Mic, X, Camera, Car } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { MiniMap } from "@/components/MiniMap";
import { AlertDetailsModal } from "@/components/AlertDetailsModal";
import { useAlerts } from "@/hooks/useAlerts";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
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
  const { isRecording, startRecording, stopRecording } = useAudioRecording();
  const { latitude, longitude } = useGeolocation();
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
    age: "",
    eyeColor: "",
    hairColor: "",
    height: "",
    weight: "",
    languages: "",
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
  }, [isRecording, latitude, longitude, startRecording, stopRecording, createAlert]);

  const handleAmberSubmit = useCallback(async () => {
    if (!latitude || !longitude) {
      toast.error("Unable to get your location. Please enable GPS.");
      return;
    }

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
        age: "",
        eyeColor: "",
        hairColor: "",
        height: "",
        weight: "",
        languages: "",
      });
      clearAmberPhoto();
    }
  }, [latitude, longitude, amberFormData, amberPhotoUrl, startRecording, createAlert, clearAmberPhoto]);

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

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Emergency Buttons - Side by Side Circles */}
        <div className="flex justify-center gap-6">
          {/* Panic Button - Circle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePanicPress}
            className={`relative w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all ${
              isRecording
                ? "bg-destructive shadow-panic"
                : "bg-destructive hover:bg-destructive/90 panic-pulse"
            }`}
          >
            {isRecording ? (
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 bg-white rounded-full recording-pulse mb-2" />
                <Mic className="w-8 h-8 text-white mb-1" />
                <span className="text-xl font-mono font-bold text-white">{formatTime(recordingTime)}</span>
                <span className="text-[10px] text-white/80 mt-1">Tap to stop</span>
              </div>
            ) : (
              <>
                <Shield className="w-12 h-12 text-white mb-1" />
                <span className="text-lg font-bold text-white">PANIC</span>
              </>
            )}
          </motion.button>

          {/* Amber Alert Button - Circle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAmberForm(true)}
            className="w-36 h-36 rounded-full bg-warning hover:bg-warning/90 flex flex-col items-center justify-center transition-all"
          >
            <AlertTriangle className="w-12 h-12 text-warning-foreground mb-1" />
            <span className="text-lg font-bold text-warning-foreground">AMBER</span>
          </motion.button>
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

        {/* Amber Alert Form Modal - Full Screen Red Design */}
        <AnimatePresence>
          {showAmberForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-destructive z-50 overflow-y-auto"
            >
              {/* Hero Photo Section with Red Gradient Overlay */}
              <div className="relative w-full h-72">
                {amberPhotoPreview ? (
                  <>
                    <img
                      src={amberPhotoPreview}
                      alt="Missing person"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-destructive/60 via-transparent to-destructive" />
                    <button
                      onClick={clearAmberPhoto}
                      className="absolute top-4 right-4 p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={selectAmberPhoto}
                    disabled={photoUploading}
                    className="w-full h-full bg-destructive/80 flex flex-col items-center justify-center gap-3 transition-colors"
                  >
                    {photoUploading ? (
                      <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                          <Camera className="w-12 h-12 text-white" />
                        </div>
                        <span className="text-white font-semibold text-lg">Add Photo</span>
                        <span className="text-white/70 text-sm">Tap to upload</span>
                      </>
                    )}
                  </button>
                )}
                
                {/* Close Button */}
                <button
                  onClick={() => setShowAmberForm(false)}
                  className="absolute top-4 left-4 p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                {/* Profile Avatar Overlap */}
                {amberPhotoPreview && (
                  <div className="absolute -bottom-12 left-6">
                    <div className="w-24 h-24 rounded-full border-4 border-destructive overflow-hidden bg-card">
                      <img
                        src={amberPhotoPreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className={`bg-card rounded-t-3xl ${amberPhotoPreview ? '-mt-6 pt-16' : 'pt-6'} min-h-[calc(100vh-18rem)]`}>
                <div className="px-5 pb-8 space-y-4">
                  {/* Name Input - Large */}
                  <div>
                    <input
                      type="text"
                      placeholder="Name of missing person"
                      value={amberFormData.description}
                      onChange={(e) => setAmberFormData({ ...amberFormData, description: e.target.value })}
                      className="w-full text-xl font-bold bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/50"
                    />
                    <div className="flex items-center gap-1 text-destructive mt-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Current Location</span>
                    </div>
                  </div>

                  {/* Details Card */}
                  <div className="bg-secondary/50 rounded-2xl p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div>
                        <span className="text-destructive font-medium">Missing Since:</span>
                        <span className="ml-2 text-foreground">{new Date().toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-destructive font-medium">Last Seen:</span>
                        <span className="ml-2 text-foreground">Current Area</span>
                      </div>
                    </div>
                    
                    {/* Physical Description Row */}
                    <div className="pt-2 border-t border-border">
                      <input
                        type="text"
                        placeholder="Age (e.g., 25)"
                        value={amberFormData.age || ''}
                        onChange={(e) => setAmberFormData({ ...amberFormData, age: e.target.value })}
                        className="w-full px-0 py-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <input
                        type="text"
                        placeholder="Eye color"
                        value={amberFormData.eyeColor || ''}
                        onChange={(e) => setAmberFormData({ ...amberFormData, eyeColor: e.target.value })}
                        className="px-0 py-1 bg-transparent focus:outline-none placeholder:text-muted-foreground/60"
                      />
                      <input
                        type="text"
                        placeholder="Hair color"
                        value={amberFormData.hairColor || ''}
                        onChange={(e) => setAmberFormData({ ...amberFormData, hairColor: e.target.value })}
                        className="px-0 py-1 bg-transparent focus:outline-none placeholder:text-muted-foreground/60"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <input
                        type="text"
                        placeholder="Height (e.g., 5'10)"
                        value={amberFormData.height || ''}
                        onChange={(e) => setAmberFormData({ ...amberFormData, height: e.target.value })}
                        className="px-0 py-1 bg-transparent focus:outline-none placeholder:text-muted-foreground/60"
                      />
                      <input
                        type="text"
                        placeholder="Weight (e.g., 70kg)"
                        value={amberFormData.weight || ''}
                        onChange={(e) => setAmberFormData({ ...amberFormData, weight: e.target.value })}
                        className="px-0 py-1 bg-transparent focus:outline-none placeholder:text-muted-foreground/60"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Languages spoken"
                      value={amberFormData.languages || ''}
                      onChange={(e) => setAmberFormData({ ...amberFormData, languages: e.target.value })}
                      className="w-full px-0 py-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>

                  {/* Outfit Description */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Last Seen Wearing</label>
                    <textarea
                      placeholder="Describe clothing, accessories..."
                      value={amberFormData.outfitDescription}
                      onChange={(e) => setAmberFormData({ ...amberFormData, outfitDescription: e.target.value })}
                      className="w-full px-4 py-3 bg-secondary/50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/30"
                      rows={2}
                    />
                  </div>

                  {/* Vehicle Details */}
                  <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Car className="w-4 h-4 text-destructive" />
                      <span>Vehicle Details (if applicable)</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Make & Model"
                      value={amberFormData.vehicleMake}
                      onChange={(e) => setAmberFormData({ ...amberFormData, vehicleMake: e.target.value })}
                      className="w-full px-4 py-3 bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Color"
                        value={amberFormData.vehicleColor}
                        onChange={(e) => setAmberFormData({ ...amberFormData, vehicleColor: e.target.value })}
                        className="w-full px-4 py-3 bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                      />
                      <input
                        type="text"
                        placeholder="License Plate"
                        value={amberFormData.vehiclePlate}
                        onChange={(e) => setAmberFormData({ ...amberFormData, vehiclePlate: e.target.value })}
                        className="w-full px-4 py-3 bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
                      />
                    </div>
                  </div>

                  {/* Call to Action */}
                  <p className="text-center text-sm text-muted-foreground">
                    If seen, this alert will be broadcast to nearby users
                  </p>

                  {/* Submit Button */}
                  <button
                    onClick={handleAmberSubmit}
                    disabled={!amberFormData.description}
                    className="w-full py-4 bg-destructive hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-bold text-white transition-colors text-lg"
                  >
                    Report Missing Person
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alert Details Modal */}
        <AnimatePresence>
          {selectedAlert && (
            <AlertDetailsModal
              alert={selectedAlert}
              onClose={() => setSelectedAlert(null)}
              userLocation={userLocation}
            />
          )}
        </AnimatePresence>

        {/* Active Alerts */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Active Alerts Nearby</h2>

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
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Alerts;

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Mic, X, Camera, Car, Upload, ImageIcon } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAlerts } from "@/hooks/useAlerts";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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
  const [amberFormData, setAmberFormData] = useState({
    description: "",
    outfitDescription: "",
    vehicleMake: "",
    vehicleColor: "",
    vehiclePlate: "",
  });

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
      });
      clearAmberPhoto();
    }
  }, [latitude, longitude, amberFormData, amberPhotoUrl, startRecording, createAlert, clearAmberPhoto]);

  const activeAlerts = alerts.filter((a) => a.status === "active");

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Emergency Buttons */}
        <div className="space-y-4">
          {/* Panic Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handlePanicPress}
            className={`w-full aspect-[2.5/1] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden ${
              isRecording
                ? "bg-destructive shadow-panic"
                : "bg-destructive hover:bg-destructive/90 panic-pulse"
            }`}
          >
            {isRecording ? (
              <>
                {/* Pulsing background */}
                <div className="absolute inset-0 bg-destructive animate-pulse" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 bg-white rounded-full recording-pulse" />
                    <Mic className="w-8 h-8 text-white" />
                    <span className="text-white font-bold text-xl">RECORDING</span>
                  </div>
                  <span className="text-5xl font-mono font-bold text-white">{formatTime(recordingTime)}</span>
                  <span className="text-white/80 text-sm mt-2">Tap again to stop & send</span>
                </div>
              </>
            ) : (
              <>
                <Shield className="w-14 h-14 text-white" />
                <span className="text-2xl font-bold text-white">🚨 PANIC</span>
                <span className="text-white/70 text-xs">Hold to activate emergency alert</span>
              </>
            )}
          </motion.button>

          {/* Amber Alert Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAmberForm(true)}
            className="w-full py-6 rounded-2xl bg-warning hover:bg-warning/90 flex flex-col items-center justify-center gap-2 transition-all"
          >
            <AlertTriangle className="w-10 h-10 text-warning-foreground" />
            <span className="text-xl font-bold text-warning-foreground">🟠 AMBER ALERT</span>
            <span className="text-warning-foreground/70 text-xs">Missing Person Report</span>
          </motion.button>
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

        {/* Active Alerts */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Active Alerts Nearby</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : activeAlerts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeAlerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
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
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold capitalize truncate">{alert.type} Alert</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at!), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(Math.random() * 3).toFixed(1)}km away
                      </p>
                    </div>
                  </div>
                  <button className="w-full mt-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors">
                    View Details
                  </button>
                </motion.div>
              ))}
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

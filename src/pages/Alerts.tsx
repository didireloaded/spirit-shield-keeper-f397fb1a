import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Shield, Mic } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAlerts } from "@/hooks/useAlerts";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useGeolocation } from "@/hooks/useGeolocation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const Alerts = () => {
  const { alerts, loading, createAlert } = useAlerts();
  const { isRecording, startRecording, stopRecording } = useAudioRecording();
  const { latitude, longitude } = useGeolocation();
  
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
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
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePanicPress = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      await stopRecording();
      toast.success("Recording saved");
      setActiveAlertId(null);
      return;
    }

    // Start recording and create alert
    if (!latitude || !longitude) {
      toast.error("Unable to get your location");
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
      toast.success("PANIC alert activated! Recording...");
    }
  }, [isRecording, latitude, longitude, startRecording, stopRecording, createAlert]);

  const handleAmberPress = useCallback(async () => {
    if (!latitude || !longitude) {
      toast.error("Unable to get your location");
      return;
    }

    await startRecording();
    const { data, error } = await createAlert("amber", latitude, longitude, "Amber alert triggered");
    
    if (error) {
      toast.error("Failed to create alert");
      return;
    }
    
    if (data) {
      setActiveAlertId(data.id);
      toast.success("AMBER alert activated!");
    }
  }, [latitude, longitude, startRecording, createAlert]);

  const activeAlerts = alerts.filter(a => a.status === "active");

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Emergency Buttons */}
        <div className="grid grid-cols-2 gap-4">
          {/* Panic Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePanicPress}
            className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
              isRecording 
                ? "bg-destructive shadow-panic" 
                : "bg-destructive hover:bg-destructive/90"
            }`}
          >
            {isRecording ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-destructive-foreground rounded-full recording-pulse" />
                  <span className="text-destructive-foreground font-bold">RECORDING</span>
                </div>
                <span className="text-3xl font-mono text-destructive-foreground">{formatTime(recordingTime)}</span>
                <span className="text-xs text-destructive-foreground/80">Tap again to stop</span>
              </>
            ) : (
              <>
                <Shield className="w-12 h-12 text-destructive-foreground" />
                <span className="text-xl font-bold text-destructive-foreground">PANIC</span>
              </>
            )}
          </motion.button>

          {/* Amber Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAmberPress}
            className="aspect-square rounded-2xl bg-warning hover:bg-warning/90 flex flex-col items-center justify-center gap-2"
          >
            <AlertTriangle className="w-12 h-12 text-warning-foreground" />
            <span className="text-xl font-bold text-warning-foreground">AMBER ALERT</span>
          </motion.button>
        </div>

        {/* Active Alerts */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Active Alerts Nearby</h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : activeAlerts.length > 0 ? (
            <div className="space-y-3">
              {activeAlerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      alert.type === "panic" ? "bg-destructive" : 
                      alert.type === "amber" ? "bg-warning" : "bg-primary"
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${
                        alert.type === "amber" ? "text-warning-foreground" : "text-destructive-foreground"
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold capitalize">{alert.type} Alert</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at!), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(Math.random() * 3).toFixed(1)}km away
                      </p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors">
                    View Details
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-card rounded-xl">
              <p className="text-muted-foreground">No active alerts nearby</p>
              <p className="text-sm text-muted-foreground mt-1">Your area is safe</p>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Alerts;

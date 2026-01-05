import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, Clock, Camera, Car, Users, ChevronRight, 
  CheckCircle, AlertTriangle, Upload
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "sonner";

interface SafetySession {
  id: string;
  destination: string;
  departure_time: string;
  expected_arrival: string;
  status: string;
}

const LookAfterMe = () => {
  const { user } = useAuth();
  const { latitude, longitude } = useGeolocation();
  const [activeSession, setActiveSession] = useState<SafetySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    destination: "",
    departureTime: "",
    expectedArrival: "",
    outfitDescription: "",
    vehicleName: "",
    licensePlate: "",
    companionPhone: "",
  });

  // Fetch active session
  useEffect(() => {
    if (!user) return;

    const fetchSession = async () => {
      const { data } = await supabase
        .from("safety_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setActiveSession(data);
      }
      setLoading(false);
    };

    fetchSession();

    // Real-time subscription
    const channel = supabase
      .channel("safety-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "safety_sessions", filter: `user_id=eq.${user.id}` },
        () => {
          fetchSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleStartSession = async () => {
    if (!user) return;
    if (!formData.destination || !formData.expectedArrival) {
      toast.error("Please fill in destination and expected arrival time");
      return;
    }

    // Convert time to full timestamp
    const now = new Date();
    const [depHours, depMins] = formData.departureTime ? formData.departureTime.split(":") : [now.getHours(), now.getMinutes()];
    const [arrHours, arrMins] = formData.expectedArrival.split(":");

    const departureTime = new Date();
    departureTime.setHours(parseInt(depHours as string), parseInt(depMins as string), 0, 0);

    const expectedArrival = new Date();
    expectedArrival.setHours(parseInt(arrHours), parseInt(arrMins), 0, 0);

    // If arrival is before departure, assume next day
    if (expectedArrival < departureTime) {
      expectedArrival.setDate(expectedArrival.getDate() + 1);
    }

    const { data, error } = await supabase.from("safety_sessions").insert({
      user_id: user.id,
      destination: formData.destination,
      departure_time: departureTime.toISOString(),
      expected_arrival: expectedArrival.toISOString(),
      destination_lat: latitude,
      destination_lng: longitude,
      outfit_description: formData.outfitDescription || null,
      vehicle_name: formData.vehicleName || null,
      license_plate: formData.licensePlate || null,
      companion_phone: formData.companionPhone || null,
    }).select().single();

    if (error) {
      toast.error("Failed to start session");
      console.error(error);
    } else if (data) {
      setActiveSession(data);
      toast.success("🫶 Look After Me activated! Your watchers have been notified.");
    }
  };

  const handleMarkSafe = async () => {
    if (!activeSession) return;

    const { error } = await supabase
      .from("safety_sessions")
      .update({ status: "arrived", arrived_at: new Date().toISOString() })
      .eq("id", activeSession.id);

    if (error) {
      toast.error("Failed to update session");
    } else {
      setActiveSession(null);
      setFormData({
        destination: "",
        departureTime: "",
        expectedArrival: "",
        outfitDescription: "",
        vehicleName: "",
        licensePlate: "",
        companionPhone: "",
      });
      toast.success("✅ Marked safe! Your watchers have been notified.");
    }
  };

  const handleRunningLate = async () => {
    if (!activeSession) return;

    const { error } = await supabase
      .from("safety_sessions")
      .update({ status: "late" })
      .eq("id", activeSession.id);

    if (!error) {
      toast.info("⏰ Watchers notified that you're running late");
    }
  };

  const handleEndTrip = async () => {
    if (!activeSession) return;

    const { error } = await supabase
      .from("safety_sessions")
      .update({ status: "cancelled" })
      .eq("id", activeSession.id);

    if (!error) {
      setActiveSession(null);
      toast.info("Trip ended");
    }
  };

  const formatExpectedArrival = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="h-16 bg-card rounded-2xl animate-pulse mb-6" />
          <div className="h-64 bg-card rounded-2xl animate-pulse" />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Main Toggle Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={activeSession ? handleEndTrip : handleStartSession}
          className={`w-full py-6 rounded-2xl font-bold text-lg transition-colors ${
            activeSession
              ? "bg-success text-success-foreground"
              : "bg-success hover:bg-success/90 text-success-foreground"
          }`}
        >
          {activeSession ? "✓ Trip Active - Tap to End" : "🫶 Activate Look After Me"}
        </motion.button>

        {activeSession ? (
          /* Active Trip View */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-card rounded-2xl p-5 border border-success/30">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="font-semibold text-success">Active Trip</span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>Destination: <strong>{activeSession.destination}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Expected arrival: <strong>{formatExpectedArrival(activeSession.expected_arrival)}</strong></span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRunningLate}
                  className="flex-1 py-3 bg-warning/20 hover:bg-warning/30 border border-warning/30 rounded-xl text-sm font-medium transition-colors"
                >
                  Running Late
                </button>
                <button
                  onClick={handleMarkSafe}
                  className="flex-1 py-3 bg-success hover:bg-success/90 rounded-xl text-sm font-bold text-success-foreground transition-colors"
                >
                  Arrived Safe ✓
                </button>
              </div>
            </div>

            {/* Emergency Button */}
            <button className="w-full py-4 gradient-panic text-white font-bold rounded-xl shadow-panic flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Emergency - Alert Watchers
            </button>
          </motion.div>
        ) : (
          /* Trip Form */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-5 space-y-4"
          >
            <h3 className="font-semibold text-lg">Trip Details</h3>

            {/* Destination */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Destination *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Where are you going?"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Time inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Leaving At</label>
                <input
                  type="time"
                  value={formData.departureTime}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Expected Arrival *</label>
                <input
                  type="time"
                  value={formData.expectedArrival}
                  onChange={(e) => setFormData({ ...formData, expectedArrival: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Outfit */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Outfit Description</label>
              <textarea
                placeholder="Describe what you're wearing..."
                value={formData.outfitDescription}
                onChange={(e) => setFormData({ ...formData, outfitDescription: e.target.value })}
                className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={2}
              />
            </div>

            {/* Photo Upload */}
            <button className="w-full py-3 bg-secondary hover:bg-secondary/80 rounded-xl flex items-center justify-center gap-2 transition-colors">
              <Camera className="w-4 h-4" />
              <span className="text-sm">Upload Full-Body Photo</span>
            </button>

            {/* Vehicle Details */}
            <div className="p-4 bg-secondary/50 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Car className="w-4 h-4" />
                <span>Vehicle Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Make/Model"
                  value={formData.vehicleName}
                  onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="text"
                  placeholder="License Plate"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Companion Phone */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Companion Phone</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder="+264 81 XXX XXXX"
                  value={formData.companionPhone}
                  onChange={(e) => setFormData({ ...formData, companionPhone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Select Watchers */}
            <button className="w-full p-4 bg-secondary hover:bg-secondary/80 rounded-xl flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Select Watchers</p>
                  <p className="text-xs text-muted-foreground">0 watchers selected</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default LookAfterMe;

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, Clock, Camera, Car, Users, ChevronRight, 
  Play, CheckCircle, AlertTriangle, Plus
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

const LookAfterMe = () => {
  const [activeSession, setActiveSession] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    destination: "",
    departureTime: "",
    expectedArrival: "",
    outfitDescription: "",
    vehicleName: "",
    licensePlate: "",
    companionPhone: "",
  });

  const handleStartSession = () => {
    if (!formData.destination || !formData.expectedArrival) {
      toast.error("Please fill in destination and expected arrival time");
      return;
    }
    setActiveSession(true);
    toast.success("Look After Me session started! Your watchers have been notified.");
  };

  const handleMarkSafe = () => {
    setActiveSession(false);
    setFormData({
      destination: "",
      departureTime: "",
      expectedArrival: "",
      outfitDescription: "",
      vehicleName: "",
      licensePlate: "",
      companionPhone: "",
    });
    toast.success("Marked safe! Your watchers have been notified.");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Look After Me" />

      <main className="max-w-lg mx-auto px-4 py-6">
        {activeSession ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Active Session Card */}
            <div className="bg-success/10 border border-success/30 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-success/20 flex items-center justify-center mb-4 safe-glow">
                <Play className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-bold text-success mb-2">Session Active</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Your watchers are monitoring your trip to <strong>{formData.destination}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Expected arrival: {formData.expectedArrival}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => toast.info("Marked as running late")}
                className="p-4 bg-warning/10 border border-warning/30 rounded-xl text-center"
              >
                <Clock className="w-6 h-6 mx-auto text-warning mb-2" />
                <span className="text-sm font-medium">Running Late</span>
              </button>
              <button
                onClick={() => toast.info("Marked as staying longer")}
                className="p-4 bg-primary/10 border border-primary/30 rounded-xl text-center"
              >
                <Plus className="w-6 h-6 mx-auto text-primary mb-2" />
                <span className="text-sm font-medium">Staying Longer</span>
              </button>
            </div>

            {/* Mark Safe Button */}
            <button
              onClick={handleMarkSafe}
              className="w-full py-4 gradient-safe text-success-foreground font-bold rounded-xl shadow-safe flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              I've Arrived Safely
            </button>

            {/* Emergency */}
            <button className="w-full py-4 gradient-panic text-destructive-foreground font-bold rounded-xl shadow-panic flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Emergency - Alert Watchers
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Info Card */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <h2 className="font-semibold mb-2">Plan Your Safe Trip</h2>
              <p className="text-sm text-muted-foreground">
                Share your trip details with trusted watchers. They'll be alerted if you don't arrive on time.
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Destination */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Destination *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Where are you going?"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Leaving at
                  </label>
                  <input
                    type="time"
                    value={formData.departureTime}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Expected arrival *
                  </label>
                  <input
                    type="time"
                    value={formData.expectedArrival}
                    onChange={(e) => setFormData({ ...formData, expectedArrival: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Outfit */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Outfit Description
                </label>
                <div className="relative">
                  <textarea
                    placeholder="What are you wearing?"
                    value={formData.outfitDescription}
                    onChange={(e) => setFormData({ ...formData, outfitDescription: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>
                <button className="mt-2 flex items-center gap-2 text-sm text-primary">
                  <Camera className="w-4 h-4" />
                  Add outfit photo
                </button>
              </div>

              {/* Vehicle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Vehicle
                  </label>
                  <div className="relative">
                    <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Car make/model"
                      value={formData.vehicleName}
                      onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    License Plate
                  </label>
                  <input
                    type="text"
                    placeholder="ABC 123 W"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Companion */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Companion Phone (optional)
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="tel"
                    placeholder="+264 81 123 4567"
                    value={formData.companionPhone}
                    onChange={(e) => setFormData({ ...formData, companionPhone: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Select Watchers */}
              <button className="w-full p-4 bg-card border border-border rounded-xl flex items-center justify-between">
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
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartSession}
              className="w-full py-4 gradient-guardian text-primary-foreground font-bold rounded-xl shadow-guardian"
            >
              Start Look After Me
            </button>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default LookAfterMe;

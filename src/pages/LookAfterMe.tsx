import { useState } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, Clock, Camera, Car, Users, ChevronRight, 
  CheckCircle, Heart, MessageSquare
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

// Mock community posts for preview
const mockPosts = [
  { 
    id: 1, 
    user: "Sarah M.", 
    avatar: "👩", 
    time: "1h ago", 
    distance: "2km", 
    content: "Police presence increased near CBD today. Stay safe everyone!", 
    likes: 24, 
    comments: 5 
  },
  { 
    id: 2, 
    user: "John K.", 
    avatar: "👨", 
    time: "3h ago", 
    distance: "5km", 
    content: "Reminder: Always walk in groups after dark. Looking out for each other! 🙏", 
    likes: 45, 
    comments: 12 
  }
];

const LookAfterMe = () => {
  const [tripActive, setTripActive] = useState(false);
  const [formData, setFormData] = useState({
    destination: "",
    departureTime: "",
    expectedArrival: "",
    outfitDescription: "",
    companionPhone: "",
  });

  const handleToggleTrip = () => {
    if (tripActive) {
      setTripActive(false);
      toast.success("Trip ended. Stay safe!");
    } else {
      if (!formData.destination) {
        toast.error("Please enter a destination");
        return;
      }
      setTripActive(true);
      toast.success("Look After Me activated! Your watchers have been notified.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Main Toggle Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleToggleTrip}
          className={`w-full py-6 rounded-2xl font-bold text-lg transition-colors ${
            tripActive 
              ? "bg-success text-success-foreground" 
              : "bg-success hover:bg-success/90 text-success-foreground"
          }`}
        >
          {tripActive ? "✓ Trip Active - Tap to End" : "🫶 Activate Look After Me"}
        </motion.button>

        {tripActive ? (
          /* Active Trip View */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-card rounded-2xl p-4 border border-success/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="font-semibold text-success">Active Trip</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Destination: {formData.destination || "Independence Avenue"}
              </p>
              <p className="text-sm text-muted-foreground">
                Expected arrival: {formData.expectedArrival || "30 mins"}
              </p>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => toast.info("Marked as running late")}
                  className="flex-1 py-2 bg-warning/20 hover:bg-warning/30 border border-warning/30 rounded-lg text-sm font-medium transition-colors"
                >
                  Running Late
                </button>
                <button
                  onClick={() => {
                    setTripActive(false);
                    toast.success("Arrived safely! Watchers notified.");
                  }}
                  className="flex-1 py-2 bg-success hover:bg-success/90 rounded-lg text-sm font-medium text-success-foreground transition-colors"
                >
                  Arrived Safe ✓
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Trip Form */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-4 space-y-4"
          >
            <h3 className="font-semibold">Trip Details</h3>

            {/* Destination */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Where are you going?"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  className="w-full px-4 py-3 bg-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Return By</label>
                <input
                  type="time"
                  value={formData.expectedArrival}
                  onChange={(e) => setFormData({ ...formData, expectedArrival: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Companion Phone */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Companion Phone</label>
              <input
                type="tel"
                placeholder="+264 81 XXX XXXX"
                value={formData.companionPhone}
                onChange={(e) => setFormData({ ...formData, companionPhone: e.target.value })}
                className="w-full px-4 py-3 bg-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Outfit */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Outfit Description</label>
              <textarea
                placeholder="Describe what you're wearing..."
                value={formData.outfitDescription}
                onChange={(e) => setFormData({ ...formData, outfitDescription: e.target.value })}
                className="w-full px-4 py-3 bg-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={2}
              />
            </div>

            {/* Upload Photo */}
            <button className="w-full py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
              <Camera className="w-4 h-4" />
              Upload Photo
            </button>
          </motion.div>
        )}

        {/* Community Feed Preview */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Community Updates</h3>
          <div className="space-y-3">
            {mockPosts.map(post => (
              <div key={post.id} className="bg-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-2xl">{post.avatar}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{post.user}</p>
                    <p className="text-xs text-muted-foreground">{post.time} • {post.distance} away</p>
                  </div>
                </div>
                <p className="text-sm mb-3">{post.content}</p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <button className="flex items-center gap-1 hover:text-destructive transition-colors">
                    <Heart className="w-4 h-4" /> {post.likes}
                  </button>
                  <button className="flex items-center gap-1 hover:text-primary transition-colors">
                    <MessageSquare className="w-4 h-4" /> {post.comments}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default LookAfterMe;

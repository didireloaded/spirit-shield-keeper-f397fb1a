import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

const Map = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Live Map" />

      <div className="relative h-[calc(100vh-8rem)]">
        {/* Map Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-primary/10 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Live Map</h2>
              <p className="text-muted-foreground">
                Map integration coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Floating Controls */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="absolute bottom-24 right-4 w-12 h-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center"
        >
          <Navigation className="w-5 h-5 text-primary" />
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Map;

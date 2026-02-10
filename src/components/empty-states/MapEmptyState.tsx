/**
 * Improved Empty State for Map screen
 * Calm, clear CTA — no mock data
 */

import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onEnableLocation?: () => void;
}

export function MapEmptyState({ onEnableLocation }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-6"
    >
      <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <MapPin className="w-8 h-8 text-primary" />
      </div>
      <h3 className="font-semibold text-lg">Your Safety Map</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
        Enable location to see incidents and safety updates near you. 
        Your location stays private unless you choose to share it.
      </p>
      {onEnableLocation && (
        <Button className="mt-4 gap-2" onClick={onEnableLocation}>
          <Navigation className="w-4 h-4" />
          Enable Location
        </Button>
      )}
    </motion.div>
  );
}

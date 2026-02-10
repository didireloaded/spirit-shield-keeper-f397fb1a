/**
 * Speed & Compass Widget
 * Shows direction and speed when moving
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "lucide-react";

interface SpeedCompassProps {
  heading?: number;
  speed?: number; // m/s
}

export function SpeedCompass({ heading = 0, speed = 0 }: SpeedCompassProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(speed > 0.5);
  }, [speed]);

  const speedKmh = (speed * 3.6).toFixed(0);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed top-[calc(var(--map-top-row)+44px+var(--map-element-gap))] right-[var(--map-inset)] z-[var(--z-map-feedback)] bg-background/90 backdrop-blur-md rounded-2xl border border-border/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] p-3"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-border" />
              <motion.div
                animate={{ rotate: heading }}
                transition={{ type: "spring", damping: 20 }}
                className="absolute inset-0 flex items-start justify-center"
              >
                <Navigation className="w-5 h-5 text-primary mt-0.5" fill="currentColor" />
              </motion.div>
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary">
                N
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{speedKmh}</div>
              <div className="text-xs text-muted-foreground">km/h</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SpeedCompass;

/**
 * Crosshair Indicator
 * Shows when user is in "add incident" mode - tap on map to place a pin
 */

import { motion, AnimatePresence } from "framer-motion";
import { Crosshair } from "lucide-react";

interface CrosshairIndicatorProps {
  visible: boolean;
}

export function CrosshairIndicator({ visible }: CrosshairIndicatorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[var(--z-map-feedback)]"
        >
          <div className="relative">
            {/* Subtle pulse ring - not aggressive ping */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.3, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 -m-4 rounded-full bg-warning/30"
            />
            <div className="w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg border-2 border-warning">
              <Crosshair className="w-6 h-6 text-warning" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CrosshairIndicator;

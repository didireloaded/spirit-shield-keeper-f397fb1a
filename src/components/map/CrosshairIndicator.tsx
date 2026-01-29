/**
 * Crosshair Indicator
 * Shows when user is in "add incident" mode
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
        >
          <div className="relative">
            <div className="absolute inset-0 -m-4 rounded-full bg-warning/20 animate-ping" />
            <Crosshair className="w-8 h-8 text-warning drop-shadow-lg" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CrosshairIndicator;

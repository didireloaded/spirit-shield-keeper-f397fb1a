/**
 * Live Indicator
 * Shows count of active incidents with pulsing animation
 */

import { motion } from "framer-motion";
import { Radio } from "lucide-react";

interface LiveIndicatorProps {
  count: number;
}

export function LiveIndicator({ count }: LiveIndicatorProps) {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 bg-destructive/90 text-destructive-foreground rounded-full text-xs font-medium shadow-lg"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </span>
      <Radio className="w-3 h-3" />
      <span>{count} Live</span>
    </motion.div>
  );
}

export default LiveIndicator;

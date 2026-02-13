/**
 * Calm Banner
 * Shows "No urgent incidents nearby" when the area is safe
 * Builds user trust through positive reassurance
 */

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export function CalmBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="px-4 py-2 rounded-full bg-success text-success-foreground shadow-lg flex items-center gap-2 text-sm backdrop-blur-sm"
    >
      <ShieldCheck className="w-4 h-4" />
      <span className="font-medium">No urgent incidents nearby</span>
    </motion.div>
  );
}

export default CalmBanner;

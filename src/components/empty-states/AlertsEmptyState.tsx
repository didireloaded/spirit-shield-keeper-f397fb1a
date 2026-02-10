/**
 * Improved Empty State for Alerts screen
 * Calm, reassuring tone
 */

import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export function AlertsEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-6"
    >
      <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-4">
        <Shield className="w-8 h-8 text-success" />
      </div>
      <h3 className="font-semibold text-lg">All Clear</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
        No active alerts right now. You're safe. We'll notify you immediately 
        if something needs your attention.
      </p>
    </motion.div>
  );
}

/**
 * Mobile Report FAB
 * Floating action button above bottom sheet, bottom-right
 * Always visible, respects safe area
 */

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface MobileReportFabProps {
  onPress: () => void;
}

export function MobileReportFab({ onPress }: MobileReportFabProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => { haptics.medium(); onPress(); }}
      className="fixed right-4 z-[var(--z-map-buttons)] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 140px)" }}
      aria-label="Report incident"
    >
      <AlertTriangle className="w-6 h-6" />
    </motion.button>
  );
}

export default MobileReportFab;

/**
 * Report FAB
 * Floating action button for reporting incidents
 */

import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";

interface ReportFabProps {
  isActive?: boolean;
  onClick?: () => void;
}

export function ReportFab({ isActive = false, onClick }: ReportFabProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        fixed bottom-[280px] right-4 z-30
        flex items-center gap-2
        px-5 py-3 rounded-full shadow-lg
        transition-colors
        ${
          isActive
            ? "bg-destructive text-destructive-foreground"
            : "bg-primary text-primary-foreground"
        }
      `}
    >
      {isActive ? (
        <>
          <X className="w-5 h-5" />
          <span className="font-medium">Cancel</span>
        </>
      ) : (
        <>
          <Plus className="w-5 h-5" />
          <span className="font-medium">Report</span>
        </>
      )}
    </motion.button>
  );
}

export default ReportFab;

/**
 * Ghost Mode Toggle
 * Allows users to hide their location from others
 */

import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface GhostModeToggleProps {
  isGhost: boolean;
  onChange: (enabled: boolean) => void;
}

export function GhostModeToggle({ isGhost, onChange }: GhostModeToggleProps) {
  const handleToggle = () => {
    haptics.medium();
    onChange(!isGhost);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-full
        backdrop-blur-md border shadow-lg transition-all text-sm font-medium
        ${
          isGhost
            ? "bg-accent/20 border-accent/50 text-accent"
            : "bg-background/80 border-border/50 text-foreground"
        }
      `}
      aria-label={isGhost ? "Disable ghost mode" : "Enable ghost mode"}
    >
      {isGhost ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      <span>{isGhost ? "Ghost" : "Visible"}</span>
    </motion.button>
  );
}

export default GhostModeToggle;

/**
 * Mobile Map Controls
 * Single vertical stack: Zoom In, Zoom Out, Locate Me
 * Clean, grouped, consistent spacing
 */

import { motion } from "framer-motion";
import { Plus, Minus, Crosshair } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface MobileMapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
}

export function MobileMapControls({ onZoomIn, onZoomOut, onRecenter }: MobileMapControlsProps) {
  const Btn = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => { haptics.light(); onClick(); }}
      className="w-11 h-11 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      aria-label={label}
    >
      {children}
    </motion.button>
  );

  return (
    <div className="fixed right-4 z-[var(--z-map-buttons)] flex flex-col gap-2"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 200px)" }}
    >
      <Btn onClick={onZoomIn} label="Zoom in">
        <Plus className="w-5 h-5" />
      </Btn>
      <Btn onClick={onZoomOut} label="Zoom out">
        <Minus className="w-5 h-5" />
      </Btn>
      <Btn onClick={onRecenter} label="Center on my location">
        <Crosshair className="w-5 h-5" />
      </Btn>
    </div>
  );
}

export default MobileMapControls;

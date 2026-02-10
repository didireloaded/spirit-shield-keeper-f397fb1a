/**
 * Map Controls (Left Side)
 * Floating buttons - zoom, recenter, layers
 */

import { motion } from "framer-motion";
import { Crosshair, Layers, Plus, Minus } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface MapControlsProps {
  onRecenter?: () => void;
  onToggleLayers?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  layersActive?: boolean;
  className?: string;
}

export function MapControls({
  onRecenter,
  onToggleLayers,
  onZoomIn,
  onZoomOut,
  layersActive = false,
  className = "",
}: MapControlsProps) {
  if (!onRecenter && !onToggleLayers && !onZoomIn && !onZoomOut) return null;

  const ControlButton = ({
    onClick,
    label,
    active = false,
    children,
  }: {
    onClick?: () => void;
    label: string;
    active?: boolean;
    children: React.ReactNode;
  }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        haptics.light();
        onClick?.();
      }}
      className={`
        w-11 h-11 rounded-full
        bg-background/80 backdrop-blur-md
        border border-border/50
        shadow-lg
        flex items-center justify-center
        transition-colors
        ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}
      `}
      aria-label={label}
    >
      {children}
    </motion.button>
  );

  return (
    <div className={`fixed bottom-[calc(var(--map-bottom-safe)+56px)] left-[var(--map-inset)] z-20 flex flex-col gap-2.5 ${className}`}>
      {onZoomIn && (
        <ControlButton onClick={onZoomIn} label="Zoom in">
          <Plus className="w-5 h-5" />
        </ControlButton>
      )}
      {onZoomOut && (
        <ControlButton onClick={onZoomOut} label="Zoom out">
          <Minus className="w-5 h-5" />
        </ControlButton>
      )}
      {onRecenter && (
        <ControlButton onClick={onRecenter} label="Center on my location">
          <Crosshair className="w-5 h-5" />
        </ControlButton>
      )}
      {onToggleLayers && (
        <ControlButton onClick={onToggleLayers} label="Toggle map layers" active={layersActive}>
          <Layers className="w-5 h-5" />
        </ControlButton>
      )}
    </div>
  );
}

export default MapControls;

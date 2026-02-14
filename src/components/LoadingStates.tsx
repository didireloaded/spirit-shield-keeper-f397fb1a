/**
 * Loading state components with animations
 * Skeleton shimmer, pulsing dots, spinner, progress bar
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Skeleton with shimmer effect */
export function SkeletonShimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-muted rounded", className)}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/** Pulsing dot loader */
export function PulsingDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-primary rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

/** Spinner with trail */
export function SpinnerWithTrail({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full",
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}

/** Animated progress bar */
export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <motion.div
        className="bg-primary rounded-full h-2"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}

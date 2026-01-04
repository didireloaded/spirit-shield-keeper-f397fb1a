import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, X } from "lucide-react";

interface PanicButtonProps {
  onActivate?: () => void;
}

export const PanicButton = ({ onActivate }: PanicButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isActivated, setIsActivated] = useState(false);

  const handleMouseDown = () => {
    setIsPressed(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsActivated(true);
        onActivate?.();
      }
    }, 30);

    const handleMouseUp = () => {
      clearInterval(interval);
      setIsPressed(false);
      setHoldProgress(0);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp);
  };

  const cancelAlert = () => {
    setIsActivated(false);
    setHoldProgress(0);
  };

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence mode="wait">
        {isActivated ? (
          <motion.div
            key="activated"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-panic animate-ping opacity-30" />
              <div className="w-36 h-36 rounded-full gradient-panic flex items-center justify-center shadow-panic">
                <AlertTriangle className="w-16 h-16 text-destructive-foreground" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-destructive">ALERT ACTIVE</p>
              <p className="text-sm text-muted-foreground">Help is on the way</p>
            </div>
            <button
              onClick={cancelAlert}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel Alert
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="relative">
              {/* Outer pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full bg-panic/20"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  width: "144px",
                  height: "144px",
                  left: "-12px",
                  top: "-12px",
                }}
              />

              {/* Progress ring */}
              <svg
                className="absolute -inset-2 w-[152px] h-[152px] -rotate-90"
                viewBox="0 0 152 152"
              >
                <circle
                  cx="76"
                  cy="76"
                  r="70"
                  fill="none"
                  stroke="hsl(var(--panic) / 0.2)"
                  strokeWidth="6"
                />
                <motion.circle
                  cx="76"
                  cy="76"
                  r="70"
                  fill="none"
                  stroke="hsl(var(--panic))"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * holdProgress) / 100}
                  transition={{ duration: 0.05 }}
                />
              </svg>

              {/* Main button */}
              <motion.button
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative w-32 h-32 rounded-full
                  gradient-panic shadow-panic
                  flex items-center justify-center
                  cursor-pointer select-none
                  transition-all duration-200
                  ${isPressed ? "scale-95" : "panic-pulse"}
                `}
              >
                <div className="flex flex-col items-center gap-1">
                  <Shield className="w-10 h-10 text-destructive-foreground" />
                  <span className="text-xs font-bold text-destructive-foreground uppercase tracking-wide">
                    {isPressed ? "Hold..." : "Panic"}
                  </span>
                </div>
              </motion.button>
            </div>

            <p className="text-sm text-muted-foreground text-center max-w-[200px]">
              Hold for 1.5 seconds to activate emergency alert
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

 /**
  * Map Top Controls
  * Floating back button and optional right action (no header bar)
  */
 
 import { motion } from "framer-motion";
 import { ChevronLeft, Bell } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 
 interface MapTopControlsProps {
   onBack?: () => void;
   onRightPress?: () => void;
   showNotification?: boolean;
 }
 
 export function MapTopControls({
   onBack,
   onRightPress,
   showNotification = false,
 }: MapTopControlsProps) {
   const navigate = useNavigate();
 
   const handleBack = () => {
     if (onBack) {
       onBack();
     } else {
       navigate(-1);
     }
   };
 
   return (
    <>
      {/* Back button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleBack}
        className="
          w-10 h-10 rounded-full
          bg-background/80 backdrop-blur-md
          border border-border/50
          shadow-lg
          flex items-center justify-center
          text-foreground
          hover:bg-background transition-colors
        "
      >
        <ChevronLeft className="w-5 h-5" />
      </motion.button>

      {/* Right button (optional) */}
      {onRightPress && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRightPress}
          className="
            w-10 h-10 rounded-full
            bg-background/80 backdrop-blur-md
            border border-border/50
            shadow-lg
            flex items-center justify-center
            text-foreground
            hover:bg-background transition-colors
            relative
          "
        >
          <Bell className="w-5 h-5" />
          {showNotification && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
          )}
        </motion.button>
      )}
    </>
   );
 }
 
 export default MapTopControls;
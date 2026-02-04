/**
 * Map Header
 * Top location bar with back navigation
 */

import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MapHeaderProps {
  locationName?: string;
  onBack?: () => void;
}

export function MapHeader({ locationName = "Your Location", onBack }: MapHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-20">
      <div className="flex items-center justify-between bg-background/90 backdrop-blur-md rounded-xl px-4 py-3 shadow-sm border border-border/50">
        <button
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <p className="font-medium text-foreground truncate max-w-[200px]">
          {locationName}
        </p>

        {/* Spacer for balance */}
        <div className="w-8" />
      </div>
    </div>
  );
}

export default MapHeader;

/**
 * Distance Badge Component
 * Display distance in a formatted badge
 */

import { MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface DistanceBadgeProps {
  distanceKm: number | null | undefined;
  className?: string;
  variant?: "default" | "compact" | "detailed";
  showIcon?: boolean;
}

/**
 * Format distance for display
 */
function formatDistance(km: number): string {
  if (km < 0.1) {
    return `${Math.round(km * 1000)}m`;
  }
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)}km`;
  }
  return `${Math.round(km)}km`;
}

/**
 * Get urgency level based on distance
 */
function getUrgencyClass(km: number): string {
  if (km < 0.3) return "text-destructive"; // Very close - urgent
  if (km < 1) return "text-warning"; // Close
  return "text-primary"; // Normal
}

export function DistanceBadge({
  distanceKm,
  className,
  variant = "default",
  showIcon = true,
}: DistanceBadgeProps) {
  if (distanceKm === null || distanceKm === undefined) {
    return null;
  }

  const formattedDistance = formatDistance(distanceKm);
  const urgencyClass = getUrgencyClass(distanceKm);

  if (variant === "compact") {
    return (
      <span className={cn("text-xs font-medium", urgencyClass, className)}>
        {formattedDistance}
      </span>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {showIcon && <Navigation className={cn("w-3.5 h-3.5", urgencyClass)} />}
        <span className={cn("text-sm font-medium", urgencyClass)}>
          {formattedDistance} away
        </span>
      </div>
    );
  }

  // Default badge variant
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs font-medium",
        className
      )}
    >
      {showIcon && <MapPin className={cn("w-3 h-3", urgencyClass)} />}
      <span className={urgencyClass}>{formattedDistance}</span>
    </div>
  );
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default DistanceBadge;

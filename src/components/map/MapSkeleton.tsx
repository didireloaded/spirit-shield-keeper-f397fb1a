/**
 * Map Skeleton
 * Loading placeholder while map initializes
 */

import { Skeleton } from "@/components/ui/skeleton";

export function MapSkeleton() {
  return (
    <div className="absolute inset-0 bg-muted/20 animate-pulse z-[var(--z-map-controls)]">
      {/* Search bar skeleton */}
      <div className="absolute top-4 left-4 right-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
      {/* Left controls skeleton */}
      <div className="absolute bottom-44 left-4 space-y-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
      {/* FAB skeleton */}
      <div className="absolute bottom-32 right-4">
        <Skeleton className="h-14 w-24 rounded-full" />
      </div>
      {/* Bottom sheet skeleton */}
      <div className="absolute bottom-16 left-0 right-0">
        <Skeleton className="h-28 w-full rounded-t-3xl" />
      </div>
    </div>
  );
}

export default MapSkeleton;

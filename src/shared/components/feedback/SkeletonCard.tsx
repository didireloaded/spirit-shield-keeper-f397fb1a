/**
 * Skeleton Loading Components
 * Placeholder UI for loading states
 */

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonCardProps {
  className?: string;
}

/**
 * Generic card skeleton
 */
export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("bg-card rounded-xl p-4 animate-pulse", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

/**
 * Alert card skeleton
 */
export function SkeletonAlertCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("bg-card rounded-xl p-4 animate-pulse", className)}>
      <Skeleton className="w-10 h-10 rounded-full mb-2" />
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-8 w-full mt-3 rounded-lg" />
    </div>
  );
}

/**
 * Post card skeleton for community feed
 */
export function SkeletonPostCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("bg-card rounded-xl p-4 animate-pulse space-y-3", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * List item skeleton
 */
export function SkeletonListItem({ className }: SkeletonCardProps) {
  return (
    <div className={cn("flex items-center gap-3 py-3 animate-pulse", className)}>
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-8 h-8 rounded-lg" />
    </div>
  );
}

/**
 * Stats card skeleton
 */
export function SkeletonStatsCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("bg-card rounded-xl p-4 text-center animate-pulse", className)}>
      <Skeleton className="w-6 h-6 mx-auto mb-2 rounded" />
      <Skeleton className="h-6 w-12 mx-auto mb-1" />
      <Skeleton className="h-3 w-16 mx-auto" />
    </div>
  );
}

/**
 * Map placeholder skeleton
 */
export function SkeletonMap({ className }: SkeletonCardProps) {
  return (
    <div className={cn("bg-card rounded-xl animate-pulse relative overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Skeleton className="w-8 h-8 mx-auto rounded-full" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid of skeleton cards
 */
export function SkeletonGrid({ 
  count = 4, 
  columns = 2,
  className,
}: { 
  count?: number; 
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <div className={cn(`grid ${gridClass[columns]} gap-3`, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAlertCard key={i} />
      ))}
    </div>
  );
}

export default SkeletonCard;

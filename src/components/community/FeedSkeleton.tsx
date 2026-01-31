/**
 * Feed Skeleton Component
 * Loading placeholder for the community feed
 */

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-secondary rounded" />
              <div className="h-3 w-16 bg-secondary rounded" />
            </div>
          </div>
          {/* Content */}
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full bg-secondary rounded" />
            <div className="h-4 w-3/4 bg-secondary rounded" />
          </div>
          {/* Actions */}
          <div className="flex gap-8 mt-4 pt-4 border-t border-border">
            <div className="h-4 w-12 bg-secondary rounded" />
            <div className="h-4 w-12 bg-secondary rounded" />
            <div className="h-4 w-8 bg-secondary rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

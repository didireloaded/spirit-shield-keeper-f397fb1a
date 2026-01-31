/**
 * Community Top Bar
 * Title + optional location filter
 * Per PDF: minimal, no clutter
 */

import { MapPin } from "lucide-react";

interface CommunityTopBarProps {
  location?: string | null;
}

export function CommunityTopBar({ location }: CommunityTopBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 py-4">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold">Community</h1>
        {location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
            <MapPin className="w-3 h-3" />
            <span>{location}</span>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * User Locations List Sidebar
 * Shows nearby active users with distance and status
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Navigation, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { UserLocation } from "@/hooks/useRealtimeLocations";
import { formatDistance, distanceInMeters } from "@/lib/geo";
import { haptics } from "@/lib/haptics";

interface UserLocationsListProps {
  locations: UserLocation[];
  currentUserLocation?: { lat: number; lng: number };
  onUserSelect: (location: UserLocation) => void;
}

const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(`
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="24" fill="#3b82f6"/>
    <path d="M24 24c3.3 0 6-2.7 6-6s-2.7-6-6-6-6 2.7-6 6 2.7 6 6 6zm0 3c-4 0-12 2-12 6v3h24v-3c0-4-8-6-12-6z" fill="white"/>
  </svg>
`)}`;

export function UserLocationsList({
  locations,
  currentUserLocation,
  onUserSelect,
}: UserLocationsListProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortedLocations = currentUserLocation
    ? [...locations].sort((a, b) => {
        const distA = distanceInMeters(currentUserLocation.lat, currentUserLocation.lng, a.latitude, a.longitude);
        const distB = distanceInMeters(currentUserLocation.lat, currentUserLocation.lng, b.latitude, b.longitude);
        return distA - distB;
      })
    : locations;

  const activeUsers = sortedLocations.filter((loc) => loc.is_moving);

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          haptics.light();
          setIsOpen(!isOpen);
        }}
        className="fixed top-20 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-lg text-foreground hover:bg-background transition-colors"
      >
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium">{locations.length} Online</span>
        {activeUsers.length > 0 && (
          <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
        )}
      </motion.button>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-background z-50 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Active Users</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeUsers.length} moving · {locations.length} total
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sortedLocations.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No users online</p>
                  </div>
                ) : (
                  sortedLocations.map((location) => {
                    const distance = currentUserLocation
                      ? distanceInMeters(
                          currentUserLocation.lat,
                          currentUserLocation.lng,
                          location.latitude,
                          location.longitude
                        )
                      : null;

                    return (
                      <motion.button
                        key={location.user_id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          haptics.light();
                          onUserSelect(location);
                          setIsOpen(false);
                        }}
                        className="w-full bg-card rounded-xl border border-border p-3 text-left hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <div
                              className={`w-10 h-10 rounded-full overflow-hidden border-2 ${
                                location.is_moving ? "border-success" : "border-border"
                              }`}
                            >
                              <img
                                src={location.profile?.avatar_url || DEFAULT_AVATAR}
                                alt={location.profile?.full_name || "User"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                                }}
                              />
                            </div>
                            {location.is_moving && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success rounded-full border-2 border-background flex items-center justify-center">
                                <Navigation className="w-2 h-2 text-white" fill="currentColor" />
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {location.profile?.full_name || "Anonymous User"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {location.location_name || "Unknown location"}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              {distance !== null && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {formatDistance(distance)}
                                </span>
                              )}
                              {location.updated_at && (
                                <>
                                  <span>·</span>
                                  <span>
                                    {formatDistanceToNow(new Date(location.updated_at), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {location.is_moving && (
                            <span className="text-xs font-medium text-success px-2 py-1 bg-success/10 rounded-full flex-shrink-0">
                              Moving
                            </span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default UserLocationsList;

/**
 * Live Panic Feed
 * Real-time feed of active panic sessions with location tracking
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, MapPin, Navigation, Clock, Users, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { listItemVariants } from "@/lib/animations";

interface ActivePanic {
  id: string;
  user_id: string;
  session_type: string | null;
  incident_type: string | null;
  status: string;
  location_name: string | null;
  current_location_name: string | null;
  is_moving: boolean | null;
  initial_lat: number;
  initial_lng: number;
  last_known_lat: number;
  last_known_lng: number;
  chat_room_id: string | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
}

// Reverse geocode helper
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1&types=place,locality,neighborhood,address`
    );
    const data = await res.json();
    return data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export function LivePanicFeed() {
  const [panics, setPanics] = useState<ActivePanic[]>([]);
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPanics = async () => {
    const { data } = await supabase
      .from("panic_sessions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const panicData = data.map(p => ({ ...p, profile: profileMap.get(p.user_id) }));
      setPanics(panicData);

      // Reverse geocode locations that don't have names
      for (const panic of panicData) {
        const key = panic.id;
        if (!locationNames[key]) {
          const existingName = panic.current_location_name || panic.location_name;
          if (existingName) {
            setLocationNames(prev => ({ ...prev, [key]: existingName }));
          } else {
            const lat = panic.last_known_lat || panic.initial_lat;
            const lng = panic.last_known_lng || panic.initial_lng;
            reverseGeocode(lat, lng).then(name => {
              setLocationNames(prev => ({ ...prev, [key]: name }));
            });
          }
        }
      }
    } else {
      setPanics([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPanics();

    const channel = supabase
      .channel("live-panics")
      .on("postgres_changes", { event: "*", schema: "public", table: "panic_sessions" }, () => {
        fetchPanics();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const handleViewOnMap = useCallback((panic: ActivePanic) => {
    const lat = panic.last_known_lat || panic.initial_lat;
    const lng = panic.last_known_lng || panic.initial_lng;
    navigate(`/map?lat=${lat}&lng=${lng}&zoom=16&panic=${panic.id}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (panics.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-xl">
        <Shield className="w-16 h-16 text-success mx-auto mb-4" />
        <p className="text-lg font-semibold">All Clear</p>
        <p className="text-sm text-muted-foreground">No active emergency alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active count banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </motion.div>
          <div className="flex-1">
            <p className="font-bold text-destructive text-lg">
              {panics.length} Active Emergency Alert{panics.length !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-muted-foreground">Tap to view details</p>
          </div>
        </div>
      </motion.div>

      {/* Alert cards */}
      <AnimatePresence mode="popLayout">
        {panics.map((panic) => {
          const displayLocation = locationNames[panic.id] || panic.current_location_name || panic.location_name || "Fetching location...";
          
          return (
            <motion.div
              key={panic.id}
              variants={listItemVariants}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, x: 20 }}
              layout
              className="bg-card border-2 border-destructive/30 rounded-xl p-4 shadow-lg"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                {panic.profile?.avatar_url ? (
                  <img src={panic.profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-destructive" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center border-2 border-destructive">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold truncate">{panic.profile?.full_name || "User"}</p>
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="px-2 py-0.5 bg-destructive text-destructive-foreground rounded-full text-xs font-bold uppercase"
                    >
                      LIVE
                    </motion.span>
                  </div>
                  <p className="text-sm font-medium text-destructive">
                    {panic.incident_type || panic.session_type || "Panic"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(panic.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {panic.is_moving ? "Last seen at" : "Location"}
                    </p>
                    <p className="font-medium text-sm">
                      {displayLocation}
                    </p>
                    {panic.is_moving && (
                      <p className="text-xs text-primary mt-1 flex items-center gap-1">
                        <Navigation className="w-3 h-3 animate-pulse" />
                        Person is moving
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewOnMap(panic)}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                >
                  <MapPin className="w-4 h-4" />
                  View on Map
                </button>
                {panic.chat_room_id && (
                  <button
                    onClick={() => navigate(`/amber-chat/${panic.chat_room_id}`)}
                    className="flex-1 py-2 bg-warning text-warning-foreground rounded-lg text-sm font-medium hover:bg-warning/90 transition-colors flex items-center justify-center gap-1"
                  >
                    <Users className="w-4 h-4" />
                    Join Chat
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

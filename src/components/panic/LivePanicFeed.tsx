/**
 * Live Panic Feed
 * Compact grid of active panic sessions
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, MapPin, Navigation, Users, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

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
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (panics.length === 0) {
    return (
      <div className="text-center py-8 bg-card rounded-xl">
        <Shield className="w-10 h-10 text-success mx-auto mb-2" />
        <p className="text-sm font-semibold">All Clear</p>
        <p className="text-xs text-muted-foreground">No active emergency alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Active count */}
      <div className="flex items-center gap-2 px-1">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <AlertTriangle className="w-4 h-4 text-destructive" />
        </motion.div>
        <span className="text-sm font-semibold text-destructive">
          {panics.length} Active Alert{panics.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {panics.map((panic) => {
            const displayLocation = locationNames[panic.id] || panic.current_location_name || panic.location_name || "Locating...";

            return (
              <motion.div
                key={panic.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
                className="bg-card border border-destructive/20 rounded-xl p-3 flex flex-col gap-2"
              >
                {/* Avatar + LIVE */}
                <div className="flex items-center gap-2">
                  {panic.profile?.avatar_url ? (
                    <img src={panic.profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-destructive/40" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{panic.profile?.full_name || "User"}</p>
                  </div>
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="px-1.5 py-0.5 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold uppercase"
                  >
                    LIVE
                  </motion.span>
                </div>

                {/* Type */}
                <p className="text-[11px] font-medium text-destructive truncate">
                  {panic.incident_type || panic.session_type || "Panic"}
                </p>

                {/* Location */}
                <div className="flex items-start gap-1 text-[10px] text-muted-foreground min-h-[24px]">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                  <span className="line-clamp-2 leading-tight">{displayLocation}</span>
                </div>

                {panic.is_moving && (
                  <p className="text-[10px] text-primary flex items-center gap-1">
                    <Navigation className="w-3 h-3 animate-pulse" />
                    Moving
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-1.5 mt-auto">
                  <button
                    onClick={() => handleViewOnMap(panic)}
                    className="flex-1 py-1.5 bg-primary text-primary-foreground rounded-lg text-[10px] font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    Map
                  </button>
                  {panic.chat_room_id && (
                    <button
                      onClick={() => navigate(`/amber-chat/${panic.chat_room_id}`)}
                      className="flex-1 py-1.5 bg-warning text-warning-foreground rounded-lg text-[10px] font-medium hover:bg-warning/90 transition-colors flex items-center justify-center gap-1"
                    >
                      <Users className="w-3 h-3" />
                      Chat
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

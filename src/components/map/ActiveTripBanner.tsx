/**
 * Active Trip Banner
 * Shows when user has an active Look After Me session
 * Self-contained: fetches trip data via realtime subscription
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Route, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export interface ActiveTrip {
  id: string;
  destination: string;
  expected_arrival: string;
  status: string;
  departure_time: string;
  destination_lat: number | null;
  destination_lng: number | null;
}

interface ActiveTripBannerProps {
  trip?: ActiveTrip | null;
  visible?: boolean;
  className?: string;
}

export function ActiveTripBanner({ trip: externalTrip, visible = true, className = "" }: ActiveTripBannerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [internalTrip, setInternalTrip] = useState<ActiveTrip | null>(null);

  const trip = externalTrip !== undefined ? externalTrip : internalTrip;

  // Self-fetch if no external trip provided
  useEffect(() => {
    if (externalTrip !== undefined || !user) return;

    const fetchTrip = async () => {
      const { data } = await supabase
        .from("safety_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setInternalTrip(data);
    };

    fetchTrip();

    const channel = supabase
      .channel("active-trip-banner")
      .on("postgres_changes", { event: "*", schema: "public", table: "safety_sessions", filter: `user_id=eq.${user.id}` }, fetchTrip)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user, externalTrip]);

  if (!trip || !visible) return null;

  const isLate = trip.status === "late" || new Date(trip.expected_arrival) < new Date();

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        onClick={() => navigate("/look-after-me")}
        className={`${className} w-full`}
      >
        <div
          className={`
            backdrop-blur-sm px-4 py-3 rounded-xl
            flex items-center gap-3 shadow-lg border
            ${isLate 
              ? "bg-warning/90 text-warning-foreground border-warning/50" 
              : "bg-success/90 text-success-foreground border-success/50"
            }
          `}
        >
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            {isLate ? (
              <Clock className="w-4 h-4 animate-pulse" />
            ) : (
              <Route className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold">
              {isLate ? "⚠️ Running Late" : "🛡️ Trip Active"}
            </p>
            <p className="text-xs opacity-80 truncate">
              → {trip.destination}
            </p>
          </div>
          <div className="text-right flex items-center gap-1">
            <div>
              <p className="text-xs opacity-70">ETA</p>
              <p className="text-sm font-bold">
                {new Date(trip.expected_arrival).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60" />
          </div>
        </div>
      </motion.button>
    </AnimatePresence>
  );
}

export default ActiveTripBanner;

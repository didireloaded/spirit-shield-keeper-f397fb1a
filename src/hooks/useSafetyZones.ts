/**
 * Safety Zones Hook
 * Manages user-defined safe places (home, work, school, routes)
 * Provides zone-awareness for panic priority and route deviation detection
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { distanceInMeters } from "@/lib/geo";

export type ZoneType = "home" | "work" | "school" | "route" | "custom";

export interface SafetyZone {
  id: string;
  user_id: string;
  label: string;
  zone_type: ZoneType;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useSafetyZones = () => {
  const { user } = useAuth();
  const [zones, setZones] = useState<SafetyZone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchZones = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("safety_zones")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (data) setZones(data as SafetyZone[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const addZone = useCallback(async (zone: {
    label: string;
    zone_type: ZoneType;
    latitude: number;
    longitude: number;
    radius_meters?: number;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("safety_zones")
      .insert({
        user_id: user.id,
        label: zone.label,
        zone_type: zone.zone_type,
        latitude: zone.latitude,
        longitude: zone.longitude,
        radius_meters: zone.radius_meters || 200,
      })
      .select()
      .single();

    if (!error && data) {
      setZones(prev => [data as SafetyZone, ...prev]);
      return data;
    }
    return null;
  }, [user]);

  const removeZone = useCallback(async (zoneId: string) => {
    if (!user) return;
    await supabase.from("safety_zones").update({ is_active: false }).eq("id", zoneId).eq("user_id", user.id);
    setZones(prev => prev.filter(z => z.id !== zoneId));
  }, [user]);

  const isInSafeZone = useCallback((lat: number, lng: number): SafetyZone | null => {
    for (const zone of zones) {
      if (distanceInMeters(lat, lng, zone.latitude, zone.longitude) <= zone.radius_meters) {
        return zone;
      }
    }
    return null;
  }, [zones]);

  const getZonePriorityModifier = useCallback((lat: number, lng: number): number => {
    // If outside all safety zones, increase priority
    const inZone = isInSafeZone(lat, lng);
    return inZone ? 0 : 20; // +20 priority boost when outside safe zones
  }, [isInSafeZone]);

  return {
    zones,
    loading,
    addZone,
    removeZone,
    isInSafeZone,
    getZonePriorityModifier,
    refetch: fetchZones,
  };
};

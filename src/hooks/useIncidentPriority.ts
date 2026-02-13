/**
 * Incident Priority System
 * Score-based urgency calculation with Namibia-specific tuning
 * Drives visual urgency ladder on map markers
 * 
 * Factors: incident type, status, time decay, distance, night mode, rural/urban
 */

import { useEffect, useRef, useMemo, MutableRefObject } from "react";
import { distanceInMeters } from "@/lib/geo";
import mapboxgl from "mapbox-gl";

interface Incident {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  status?: string;
  created_at?: string;
  description?: string | null;
}

interface UseIncidentPriorityOptions {
  mapRef: MutableRefObject<mapboxgl.Map | null>;
  mapLoadedRef: MutableRefObject<boolean>;
  incidents: Incident[];
  userLocation: { lat: number; lng: number } | null;
}

// ── Namibia Constants ──
const WINDHOEK_CENTER = { lat: -22.5609, lng: 17.0832 };
const WINDHOEK_RADIUS = 12000; // 12km

function isUrbanArea(lat: number, lng: number): boolean {
  return distanceInMeters(WINDHOEK_CENTER.lat, WINDHOEK_CENTER.lng, lat, lng) <= WINDHOEK_RADIUS;
}

function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 19 || hour <= 5;
}

/**
 * Namibia-tuned urgency scoring
 * Accounts for rural isolation, night risk, time decay, and incident type
 */
function namibiaUrgencyScore(
  incident: Incident,
  userLocation: { lat: number; lng: number } | null,
  isNight: boolean
): number {
  const now = Date.now();
  let score = 0;

  const ageMinutes = incident.created_at
    ? (now - new Date(incident.created_at).getTime()) / 60000
    : 999;

  const distance = userLocation
    ? distanceInMeters(userLocation.lat, userLocation.lng, incident.latitude, incident.longitude)
    : Infinity;

  const urban = isUrbanArea(incident.latitude, incident.longitude);

  // 1. Incident type (base weight)
  switch (incident.type) {
    case "panic": score += 90; break;
    case "robbery":
    case "assault":
    case "kidnapping": score += 70; break;
    case "crash":
    case "accident": score += 55; break;
    case "suspicious": score += 40; break;
    default: score += 25;
  }

  // 2. Status weighting
  if (incident.status === "en_route") score += 25;
  if (incident.status === "on_scene") score += 10;
  if (incident.status === "resolved") score -= 40;

  // 3. Time decay (rural = slower decay)
  if (urban) {
    if (ageMinutes < 5) score += 25;
    else if (ageMinutes < 15) score += 15;
    else score -= 20;
  } else {
    if (ageMinutes < 15) score += 30;
    else if (ageMinutes < 45) score += 20;
    else score -= 5;
  }

  // 4. Distance (rural = softer drop-off)
  if (urban) {
    if (distance < 1000) score += 30;
    else if (distance < 3000) score += 15;
    else score -= 15;
  } else {
    if (distance < 5000) score += 25;
    else if (distance < 15000) score += 15;
  }

  // 5. Night amplification
  if (isNight) {
    if (["panic", "robbery", "assault", "kidnapping"].includes(incident.type)) {
      score += 20;
    }
    if (distance > 3000) score += 10; // isolation risk
  }

  // 6. Abuse protection for stale panic
  if (incident.type === "panic" && ageMinutes > 30) score -= 50;

  return Math.max(score, 0);
}

/**
 * Visual urgency glow ladder
 * Maps score → radius, opacity for map marker highlighting
 */
function urgencyToGlow(score: number, isNight: boolean) {
  let radius = 10;
  let opacity = 0.4;

  if (score >= 120) { radius = 20; opacity = 0.9; }
  else if (score >= 90) { radius = 16; opacity = 0.7; }
  else if (score >= 60) { radius = 13; opacity = 0.55; }

  // Night = slightly bigger, brighter glow
  if (isNight) {
    radius += 2;
    opacity = Math.min(opacity + 0.1, 1);
  }

  return { radius, opacity };
}

/**
 * Resolve the highest-priority incident from a list
 */
function resolvePriority(
  incidents: Incident[],
  userLocation: { lat: number; lng: number } | null,
  isNight: boolean
) {
  let best: Incident | null = null;
  let bestScore = 0;

  for (const incident of incidents) {
    if (!incident.latitude || !incident.longitude) continue;
    if (incident.status === "resolved") continue;

    const score = namibiaUrgencyScore(incident, userLocation, isNight);
    if (score > bestScore) {
      best = incident;
      bestScore = score;
    }
  }

  return best ? { incident: best, score: bestScore } : null;
}

/**
 * Hook: drives map marker visual urgency based on priority scores
 * Highlights the most urgent incident with glow effects
 */
export function useIncidentPriority({
  mapRef,
  mapLoadedRef,
  incidents,
  userLocation,
}: UseIncidentPriorityOptions) {
  const lastFocusedId = useRef<string | null>(null);
  const lastFocusTime = useRef(0);
  const isNight = isNightTime();

  // Resolve the top-priority incident
  const resolved = useMemo(
    () => resolvePriority(incidents, userLocation, isNight),
    [incidents, userLocation, isNight]
  );

  // Apply visual urgency to map layers
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current || !resolved) return;

    const map = mapRef.current;
    const { incident, score } = resolved;
    const now = Date.now();

    // Debounce: don't re-focus same incident within 15s unless high score
    const shouldFocus =
      incident.id !== lastFocusedId.current &&
      (now - lastFocusTime.current > 15000 || score > 80);

    if (!shouldFocus && incident.id === lastFocusedId.current) {
      // Still update glow even if not re-focusing
    }

    const glow = urgencyToGlow(score, isNight);

    try {
      if (map.getLayer("incident-points")) {
        // Highlight focused incident
        map.setPaintProperty("incident-points", "circle-stroke-width", [
          "case",
          ["==", ["get", "id"], incident.id],
          4,
          2,
        ]);

        map.setPaintProperty("incident-points", "circle-stroke-color", [
          "case",
          ["==", ["get", "id"], incident.id],
          "#ffffff",
          "#999999",
        ]);
      }
    } catch {
      // Layer may not exist yet
    }

    if (shouldFocus) {
      lastFocusedId.current = incident.id;
      lastFocusTime.current = now;
    }
  }, [mapRef, mapLoadedRef, resolved, isNight]);

  return {
    focusedIncident: resolved?.incident || null,
    focusedScore: resolved?.score || 0,
    isNight,
  };
}

/**
 * Hook: Calm state detection
 * Returns true when no urgent incidents are nearby
 */
export function useCalmState(
  incidents: Incident[],
  userLocation: { lat: number; lng: number } | null
): boolean {
  return useMemo(() => {
    if (!incidents?.length || !userLocation) return true;

    const now = Date.now();

    return !incidents.some((i) => {
      if (!i.latitude || !i.longitude) return false;
      if (i.status === "resolved") return false;

      const age = now - new Date(i.created_at || now).getTime();
      const distance = distanceInMeters(
        userLocation.lat,
        userLocation.lng,
        i.latitude,
        i.longitude
      );

      // Active + recent + nearby = not calm
      return age < 15 * 60 * 1000 && distance < 3000;
    });
  }, [incidents, userLocation]);
}

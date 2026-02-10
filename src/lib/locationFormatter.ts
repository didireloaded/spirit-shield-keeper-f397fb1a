/**
 * LocationFormatter - Centralized GPS → Human-readable location converter
 * Single responsibility: Convert coordinates to place names
 * Used by: Active Users, Panic Alerts, Incidents, Look After Me, Community
 * 
 * NO raw GPS coordinates should EVER be displayed to users.
 */

const cache = new Map<string, { name: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const pendingRequests = new Map<string, Promise<string>>();

function cacheKey(lat: number, lng: number): string {
  // Round to ~111m precision to group nearby points
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * Reverse geocode GPS coordinates to a human-readable location name.
 * Results are cached and deduplicated.
 */
export async function formatLocation(
  lat: number,
  lng: number,
  mapboxToken?: string | null
): Promise<string> {
  const key = cacheKey(lat, lng);

  // Check cache
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.name;
  }

  // Deduplicate in-flight requests
  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const token = mapboxToken || import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) return "Location unavailable";

  const promise = (async () => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=place,neighborhood,locality,address&limit=1`
      );
      const data = await response.json();

      if (data.features?.length > 0) {
        const feature = data.features[0];
        // Extract short name: neighborhood/place, city
        const name = feature.place_name
          .split(",")
          .slice(0, 2)
          .join(",")
          .trim();
        cache.set(key, { name, timestamp: Date.now() });
        return name;
      }
      return "Unknown area";
    } catch {
      return "Location unavailable";
    } finally {
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Synchronous: return cached location or fallback text.
 * Use when you can't await (e.g., inside render).
 */
export function getCachedLocation(lat: number, lng: number): string | null {
  const key = cacheKey(lat, lng);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.name;
  }
  return null;
}

/**
 * React hook helper: format location and trigger re-render when resolved
 */
import { useState, useEffect } from "react";

export function useFormattedLocation(
  lat: number | null | undefined,
  lng: number | null | undefined
): { locationName: string; loading: boolean } {
  const [locationName, setLocationName] = useState<string>("Loading...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (lat == null || lng == null) {
      setLocationName("Location unavailable");
      setLoading(false);
      return;
    }

    // Check cache first for instant display
    const cached = getCachedLocation(lat, lng);
    if (cached) {
      setLocationName(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    formatLocation(lat, lng).then((name) => {
      if (!cancelled) {
        setLocationName(name);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return { locationName, loading };
}

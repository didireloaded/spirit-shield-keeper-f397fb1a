/**
 * ETA Calculation Hook
 * Calculates arrival time using Mapbox Directions API
 */

import { useState, useEffect, useCallback } from 'react';

interface ETAResult {
  duration: number; // minutes
  distance: number; // meters
  arrivalTime: string;
  trafficLevel: 'light' | 'moderate' | 'heavy';
}

export function useETACalculation(
  origin: { lat: number; lng: number } | null,
  destination: { lat: number; lng: number } | null
) {
  const [eta, setETA] = useState<ETAResult | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateETA = useCallback(async () => {
    if (!origin || !destination) {
      setETA(null);
      return;
    }

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${token}&geometries=geojson&overview=full&annotations=duration,distance,congestion`
      );

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const durationMinutes = Math.ceil(route.duration / 60);

        const now = new Date();
        const arrivalDate = new Date(now.getTime() + route.duration * 1000);
        const arrivalTime = arrivalDate.toTimeString().slice(0, 5);

        const congestions = route.legs?.[0]?.annotation?.congestion || [];
        const heavyCount = congestions.filter((c: string) => c === 'heavy' || c === 'severe').length;
        const trafficLevel: ETAResult['trafficLevel'] = heavyCount > congestions.length * 0.3
          ? 'heavy'
          : heavyCount > congestions.length * 0.1
            ? 'moderate'
            : 'light';

        setETA({ duration: durationMinutes, distance: route.distance, arrivalTime, trafficLevel });
      }
    } catch (error) {
      console.error('ETA calculation failed:', error);
    } finally {
      setLoading(false);
    }
  }, [origin, destination]);

  useEffect(() => {
    calculateETA();
  }, [calculateETA]);

  return { eta, loading, recalculate: calculateETA };
}

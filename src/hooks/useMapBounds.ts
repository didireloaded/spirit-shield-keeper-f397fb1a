/**
 * Map Bounds Hook
 * Tracks the visible map bounds with debouncing
 * Prevents excessive re-fetching during pan/zoom
 */

import { useState, useRef, useCallback } from "react";

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface UseMapBoundsOptions {
  debounceMs?: number;
}

export function useMapBounds(options: UseMapBoundsOptions = {}) {
  const { debounceMs = 300 } = options;
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateBounds = useCallback(
    (nextBounds: MapBounds) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setBounds(nextBounds);
      }, debounceMs);
    },
    [debounceMs]
  );

  const updateBoundsImmediate = useCallback((nextBounds: MapBounds) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setBounds(nextBounds);
  }, []);

  const clearBounds = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setBounds(null);
  }, []);

  return {
    bounds,
    updateBounds,
    updateBoundsImmediate,
    clearBounds,
  };
}

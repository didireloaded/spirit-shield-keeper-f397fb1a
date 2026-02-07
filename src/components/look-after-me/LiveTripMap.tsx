/**
 * Live Trip Map
 * Shows user's journey on a mini-map during active trip
 */

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion } from 'framer-motion';
import { Target, Flag } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { distanceInMeters } from '@/lib/geo';

interface LiveTripMapProps {
  destination: {
    name: string;
    lat: number;
    lng: number;
  };
  expectedArrival: string;
}

export function LiveTripMap({ destination, expectedArrival }: LiveTripMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapLoadedRef = useRef(false);
  const { latitude, longitude } = useGeolocation();
  const [distanceRemaining, setDistanceRemaining] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [destination.lng, destination.lat],
      zoom: 12,
      interactive: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      mapLoadedRef.current = true;

      new mapboxgl.Marker({ color: '#22c55e' })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map);
    });

    return () => {
      mapLoadedRef.current = false;
      map.remove();
    };
  }, [destination.lat, destination.lng]);

  // Update user location on map
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current || !latitude || !longitude) return;

    const map = mapRef.current;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.innerHTML = `<div class="w-8 h-8 rounded-full bg-blue-500 border-4 border-white shadow-lg flex items-center justify-center"><div class="w-2 h-2 rounded-full bg-white"></div></div>`;

      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([longitude, latitude]);
    }

    const dist = distanceInMeters(latitude, longitude, destination.lat, destination.lng);
    setDistanceRemaining(dist);

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([longitude, latitude]);
    bounds.extend([destination.lng, destination.lat]);
    map.fitBounds(bounds, { padding: 50, duration: 1000 });
  }, [latitude, longitude, destination]);

  // Calculate time remaining
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const [hours, minutes] = expectedArrival.split(':');
      const arrivalDate = new Date();
      arrivalDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const diffMs = arrivalDate.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 0) {
        setTimeRemaining('Overdue');
      } else if (diffMins < 60) {
        setTimeRemaining(`${diffMins} min`);
      } else {
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        setTimeRemaining(`${h}h ${m}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expectedArrival]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl overflow-hidden border border-border"
    >
      <div ref={mapContainer} className="w-full h-48" />

      <div className="p-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3">
          <Target className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="text-lg font-bold">
              {distanceRemaining ? `${(distanceRemaining / 1000).toFixed(1)} km` : '...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3">
          <Flag className="w-5 h-5 text-success" />
          <div>
            <p className="text-xs text-muted-foreground">ETA</p>
            <p className={`text-lg font-bold ${timeRemaining === 'Overdue' ? 'text-destructive' : ''}`}>
              {timeRemaining || '...'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

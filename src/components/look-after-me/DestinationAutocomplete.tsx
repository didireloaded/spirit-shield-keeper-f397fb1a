/**
 * Destination Autocomplete
 * Mapbox geocoding autocomplete for Look After Me destination input
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Loader2 } from 'lucide-react';

interface DestinationAutocompleteProps {
  value: string;
  onChange: (value: string, coords?: { lat: number; lng: number }) => void;
}

export function DestinationAutocomplete({ value, onChange }: DestinationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        if (!token) return;

        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${token}&limit=5&proximity=ip&country=na`
        );
        const data = await response.json();
        setSuggestions(data.features || []);
      } catch (error) {
        console.error('Geocoding failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPlace = (place: any) => {
    const coords = { lat: place.center[1], lng: place.center[0] };
    onChange(place.place_name, coords);
    setShowSuggestions(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Where are you going?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 right-0 bg-card rounded-xl border border-border shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto"
          >
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase">
                Suggestions
              </p>
              {suggestions.map((place) => (
                <button
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  className="w-full px-3 py-3 flex items-start gap-3 hover:bg-muted rounded-lg transition-colors text-left"
                >
                  <MapPin className="w-4 h-4 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{place.text}</p>
                    <p className="text-xs text-muted-foreground truncate">{place.place_name}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

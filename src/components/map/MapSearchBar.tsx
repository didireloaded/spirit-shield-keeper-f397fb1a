/**
 * Enhanced Map Search Bar
 * Geocoding autocomplete with recent searches and incident search
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MapPin, Clock, Navigation } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface SearchResult {
  id: string;
  type: "place" | "incident" | "recent";
  label: string;
  description?: string;
  coordinates?: [number, number];
}

interface MapSearchBarProps {
  onLocationSelect: (lat: number, lng: number, zoom?: number) => void;
  incidents?: Array<{ id: string; type: string; description?: string | null; latitude: number; longitude: number }>;
  mapboxToken?: string | null;
  className?: string;
}

export function MapSearchBar({
  onLocationSelect,
  incidents = [],
  mapboxToken,
  className = "",
}: MapSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("recentMapSearches") || "[]");
      setRecentSearches(saved.slice(0, 5));
    } catch {
      // ignore
    }
  }, []);

  // Debounced geocoding search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const token = mapboxToken || import.meta.env.VITE_MAPBOX_TOKEN;
      if (!token) return;

      setLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5&proximity=ip`
        );
        const data = await response.json();

        const placeResults: SearchResult[] = (data.features || []).map((f: any) => ({
          id: f.id,
          type: "place" as const,
          label: f.place_name.split(",")[0],
          description: f.place_name.split(",").slice(1).join(",").trim(),
          coordinates: f.center as [number, number],
        }));

        // Search local incidents
        const incidentResults: SearchResult[] = incidents
          .filter(
            (inc) =>
              inc.description?.toLowerCase().includes(query.toLowerCase()) ||
              inc.type?.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 3)
          .map((inc) => ({
            id: inc.id,
            type: "incident" as const,
            label: `${inc.type} Incident`,
            description: inc.description || undefined,
            coordinates: [inc.longitude, inc.latitude] as [number, number],
          }));

        setResults([...placeResults, ...incidentResults]);
      } catch (error) {
        console.error("[Search] Error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, incidents, mapboxToken]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      haptics.light();
      if (result.coordinates) {
        onLocationSelect(result.coordinates[1], result.coordinates[0], 15);
        setQuery(result.label);
        setIsOpen(false);

        // Save to recent
        try {
          const recent = JSON.parse(localStorage.getItem("recentMapSearches") || "[]");
          const updated = [
            { ...result, type: "recent" as const },
            ...recent.filter((r: SearchResult) => r.id !== result.id),
          ].slice(0, 5);
          localStorage.setItem("recentMapSearches", JSON.stringify(updated));
          setRecentSearches(updated);
        } catch {
          // ignore
        }
      }
    },
    [onLocationSelect]
  );

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  const iconForType = (type: string) => {
    switch (type) {
      case "place":
        return <MapPin className="w-4 h-4 text-primary" />;
      case "incident":
        return <Navigation className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className={`fixed top-4 left-16 right-4 z-20 ${className}`}>
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            placeholder="Search places or incidents..."
            className="w-full h-11 pl-11 pr-11 rounded-2xl bg-background/90 backdrop-blur-md border border-border/50 shadow-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (query || recentSearches.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-full mt-2 left-0 right-0 bg-background/95 backdrop-blur-md rounded-2xl border border-border/50 shadow-xl overflow-hidden max-h-80 overflow-y-auto"
            >
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
              ) : results.length > 0 ? (
                <div className="py-1">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(result)}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="mt-0.5">{iconForType(result.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{result.label}</p>
                        {result.description && (
                          <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : !query && recentSearches.length > 0 ? (
                <div className="py-1">
                  <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Recent</p>
                  {recentSearches.map((result) => (
                    <button
                      key={result.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(result)}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{result.label}</p>
                        {result.description && (
                          <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : query && !loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default MapSearchBar;

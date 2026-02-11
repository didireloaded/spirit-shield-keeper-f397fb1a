/**
 * Compact Map Search Bar - Dynamic Island style
 * Collapsed pill by default, expands on tap
 * Floats above map without blocking core view
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
  const [isExpanded, setIsExpanded] = useState(false);
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

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

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
        setQuery("");
        setIsExpanded(false);

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

  const handleClose = () => {
    setIsExpanded(false);
    setQuery("");
    setResults([]);
  };

  const iconForType = (type: string) => {
    switch (type) {
      case "place":
        return <MapPin className="w-3.5 h-3.5 text-primary" />;
      case "incident":
        return <Navigation className="w-3.5 h-3.5 text-destructive" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className={`fixed top-[var(--map-top-row)] left-[60px] right-[60px] z-[var(--z-map-controls)] flex justify-center ${className}`}>
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          /* ── Collapsed Pill (Dynamic Island style) ── */
          <motion.button
            key="pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              haptics.light();
              setIsExpanded(true);
            }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]"
          >
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search</span>
          </motion.button>
        ) : (
          /* ── Expanded Search Bar ── */
          <motion.div
            key="expanded"
            initial={{ opacity: 0, width: 120, scale: 0.95 }}
            animate={{ opacity: 1, width: "min(calc(100vw - 2rem), 400px)", scale: 1 }}
            exit={{ opacity: 0, width: 120, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative"
          >
            {/* Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search places or incidents..."
                className="w-full h-8 pl-9 pr-9 rounded-full bg-background/95 backdrop-blur-md border border-border/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
              <button
                onClick={handleClose}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Dropdown Results */}
            <AnimatePresence>
              {(query || recentSearches.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full mt-1.5 left-0 right-0 bg-background/95 backdrop-blur-md rounded-xl border border-border/50 shadow-xl overflow-hidden max-h-64 overflow-y-auto"
                >
                  {loading ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">Searching...</div>
                  ) : results.length > 0 ? (
                    <div className="py-0.5">
                      {results.map((result) => (
                        <button
                          key={result.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelect(result)}
                          className="w-full px-3 py-2.5 flex items-start gap-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="mt-0.5">{iconForType(result.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{result.label}</p>
                            {result.description && (
                              <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : !query && recentSearches.length > 0 ? (
                    <div className="py-0.5">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent</p>
                      {recentSearches.map((result) => (
                        <button
                          key={result.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelect(result)}
                          className="w-full px-3 py-2.5 flex items-start gap-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{result.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : query && !loading ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">No results found</div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MapSearchBar;

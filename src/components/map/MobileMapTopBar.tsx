/**
 * Mobile Map Top Bar
 * Single unified horizontal bar: Back | Search | Ghost | Legend
 * Replaces scattered floating top elements on mobile
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Search, X, Eye, EyeOff, Info, MapPin, Clock, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { haptics } from "@/lib/haptics";

interface SearchResult {
  id: string;
  type: "place" | "incident" | "recent";
  label: string;
  description?: string;
  coordinates?: [number, number];
}

interface MobileMapTopBarProps {
  isGhost: boolean;
  onGhostToggle: (enabled: boolean) => void;
  onLocationSelect: (lat: number, lng: number, zoom?: number) => void;
  incidents?: Array<{ id: string; type: string; description?: string | null; latitude: number; longitude: number }>;
  onBack?: () => void;
}

export function MobileMapTopBar({
  isGhost,
  onGhostToggle,
  onLocationSelect,
  incidents = [],
  onBack,
}: MobileMapTopBarProps) {
  const navigate = useNavigate();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  // Load recent searches
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("recentMapSearches") || "[]");
      setRecentSearches(saved.slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (searchExpanded) setTimeout(() => inputRef.current?.focus(), 150);
  }, [searchExpanded]);

  // Geocoding search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const token = import.meta.env.VITE_MAPBOX_TOKEN;
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5&proximity=ip`
        );
        const data = await res.json();
        const places: SearchResult[] = (data.features || []).map((f: any) => ({
          id: f.id, type: "place" as const,
          label: f.place_name.split(",")[0],
          description: f.place_name.split(",").slice(1).join(",").trim(),
          coordinates: f.center as [number, number],
        }));
        const incidentResults: SearchResult[] = incidents
          .filter(inc => inc.description?.toLowerCase().includes(query.toLowerCase()) || inc.type?.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 3)
          .map(inc => ({
            id: inc.id, type: "incident" as const,
            label: `${inc.type} Incident`,
            description: inc.description || undefined,
            coordinates: [inc.longitude, inc.latitude] as [number, number],
          }));
        setResults([...places, ...incidentResults]);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, incidents]);

  const handleSelect = useCallback((result: SearchResult) => {
    haptics.light();
    if (result.coordinates) {
      onLocationSelect(result.coordinates[1], result.coordinates[0], 15);
      setQuery(""); setSearchExpanded(false);
      try {
        const recent = JSON.parse(localStorage.getItem("recentMapSearches") || "[]");
        const updated = [{ ...result, type: "recent" as const }, ...recent.filter((r: SearchResult) => r.id !== result.id)].slice(0, 5);
        localStorage.setItem("recentMapSearches", JSON.stringify(updated));
        setRecentSearches(updated);
      } catch { /* ignore */ }
    }
  }, [onLocationSelect]);

  const iconForType = (type: string) => {
    if (type === "place") return <MapPin className="w-3.5 h-3.5 text-primary" />;
    if (type === "incident") return <Navigation className="w-3.5 h-3.5 text-destructive" />;
    return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const incidentTypes = [
    { color: "#ef4444", label: "Emergency", icon: "🚨" },
    { color: "#f59e0b", label: "Amber Alert", icon: "🔍" },
    { color: "#eab308", label: "Vehicle Crash", icon: "🚗" },
    { color: "#8b5cf6", label: "Robbery", icon: "💰" },
    { color: "#ec4899", label: "Assault", icon: "⚡" },
    { color: "#06b6d4", label: "Suspicious", icon: "👁️" },
  ];

  return (
    <>
      {/* ── UNIFIED TOP BAR ── */}
      <div className="fixed top-0 left-0 right-0 z-[var(--z-map-controls)] pointer-events-none"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 pointer-events-auto">
          {/* Back */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-lg flex items-center justify-center text-foreground flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          {/* Search Pill (center, flex-1) */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { haptics.light(); setSearchExpanded(true); }}
            className="flex-1 flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-lg"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search</span>
          </motion.button>

          {/* Ghost Toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { haptics.medium(); onGhostToggle(!isGhost); }}
            className={`w-10 h-10 rounded-full backdrop-blur-md border shadow-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              isGhost
                ? "bg-accent/20 border-accent/50 text-accent"
                : "bg-background/80 border-border/50 text-foreground"
            }`}
            aria-label={isGhost ? "Disable ghost mode" : "Enable ghost mode"}
          >
            {isGhost ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </motion.button>

          {/* Legend / Info */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { haptics.light(); setLegendOpen(true); }}
            className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-lg flex items-center justify-center text-foreground flex-shrink-0"
            aria-label="Map legend"
          >
            <Info className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* ── EXPANDED SEARCH OVERLAY ── */}
      <AnimatePresence>
        {searchExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[var(--z-modal)] bg-background/95 backdrop-blur-md"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="flex items-center gap-2 px-4 py-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { setSearchExpanded(false); setQuery(""); setResults([]); }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-foreground flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search places or incidents..."
                  className="w-full h-10 pl-10 pr-10 rounded-full bg-muted border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(""); setResults([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="px-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 80px)" }}>
              {loading ? (
                <p className="text-center text-sm text-muted-foreground py-8">Searching...</p>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="mt-0.5">{iconForType(r.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                        {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              ) : !query && recentSearches.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 py-2">Recent</p>
                  {recentSearches.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                    >
                      <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                      <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                    </button>
                  ))}
                </div>
              ) : query && !loading ? (
                <p className="text-center text-sm text-muted-foreground py-8">No results found</p>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LEGEND PANEL ── */}
      <AnimatePresence>
        {legendOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLegendOpen(false)}
              className="fixed inset-0 bg-black/50 z-[var(--z-modal-backdrop)] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-[var(--z-modal)] bg-background rounded-t-3xl shadow-2xl overflow-hidden"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex items-center justify-between px-5 pb-3">
                <h3 className="font-semibold text-foreground">Map Legend</h3>
                <button onClick={() => setLegendOpen(false)} className="p-1.5 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="px-5 pb-6 space-y-4 max-h-[50vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2.5">
                  {incidentTypes.map(({ color, label, icon }) => (
                    <div key={label} className="flex items-center gap-2.5 py-1.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs">{icon}</span>
                      <span className="text-sm text-foreground">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Status</h4>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                      <span className="text-sm">Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-warning" />
                      <span className="text-sm">In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-success" />
                      <span className="text-sm">Resolved</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default MobileMapTopBar;

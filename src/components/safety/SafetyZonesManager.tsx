/**
 * Safety Zones Management Component
 * Add/remove home, work, school locations
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Home, Briefcase, GraduationCap, Route, Plus, X, Trash2 } from "lucide-react";
import { useSafetyZones, type ZoneType } from "@/hooks/useSafetyZones";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "sonner";

const zoneIcons: Record<ZoneType, typeof Home> = {
  home: Home,
  work: Briefcase,
  school: GraduationCap,
  route: Route,
  custom: MapPin,
};

const zoneColors: Record<ZoneType, string> = {
  home: "text-blue-400",
  work: "text-amber-400",
  school: "text-green-400",
  route: "text-purple-400",
  custom: "text-muted-foreground",
};

export function SafetyZonesManager() {
  const { zones, loading, addZone, removeZone } = useSafetyZones();
  const { latitude, longitude } = useGeolocation(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<ZoneType>("home");
  const [radius, setRadius] = useState(200);

  const handleAdd = async () => {
    if (!newLabel.trim()) { toast.error("Enter a name"); return; }
    if (!latitude || !longitude) { toast.error("Location not available"); return; }

    await addZone({
      label: newLabel.trim(),
      zone_type: newType,
      latitude,
      longitude,
      radius_meters: radius,
    });

    setNewLabel("");
    setShowAdd(false);
    toast.success(`${newLabel} added as safety zone`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Safety Zones
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Alerts outside your safety zones trigger higher priority
      </p>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-secondary/50 rounded-xl p-3 space-y-3">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Zone name (e.g. My Home)"
                className="w-full px-3 py-2 bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              <div className="flex gap-2 flex-wrap">
                {(["home", "work", "school", "route", "custom"] as ZoneType[]).map(type => {
                  const Icon = zoneIcons[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setNewType(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                        newType === type ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Radius: {radius}m</label>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={50}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleAdd}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                Add Current Location as Zone
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-14 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : zones.length > 0 ? (
        <div className="space-y-2">
          {zones.map(zone => {
            const Icon = zoneIcons[zone.zone_type];
            return (
              <motion.div
                key={zone.id}
                layout
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
              >
                <div className={`p-2 rounded-lg bg-secondary ${zoneColors[zone.zone_type]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{zone.label}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {zone.zone_type} • {zone.radius_meters}m radius
                  </p>
                </div>
                <button
                  onClick={() => removeZone(zone.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 bg-card rounded-xl">
          <p className="text-sm text-muted-foreground">No safety zones set</p>
          <p className="text-xs text-muted-foreground mt-1">Add your home, work, or school</p>
        </div>
      )}
    </div>
  );
}

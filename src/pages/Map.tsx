/**
 * Map Page - Clean fullscreen map with floating controls
 * Map is the hero, everything floats on top
 * 
 * CRITICAL: All callbacks passed to MapboxMap must be stable refs
 * to prevent the map from re-initializing on every render.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import MapboxMap from "@/components/MapboxMap";
import IncidentDetailsModal from "@/components/IncidentDetailsModal";

// Map-specific components
import { MapTopControls } from "@/components/map/MapTopControls";
import { MapControls } from "@/components/map/MapControls";
import { ReportsBottomSheet } from "@/components/map/ReportsBottomSheet";
import { ReportFab } from "@/components/map/ReportFab";
import { IncidentReportModal } from "@/components/map/IncidentReportModal";
import { CrosshairIndicator } from "@/components/map/CrosshairIndicator";
import { NearYouStrip } from "@/components/map/NearYouStrip";

// Hooks
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyAlerts } from "@/hooks/useNearbyAlerts";
import { useNotificationAlerts } from "@/hooks/useNotificationAlerts";
import { useMapEngineState } from "@/hooks/useMapEngineState";
import { useMapMarkers, type MapMarker } from "@/hooks/useMapMarkers";
import { useMapAlerts } from "@/hooks/useMapAlerts";
import { useSelectedMarker } from "@/hooks/useSelectedMarker";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Map = () => {
  // UI State
  const [ghostMode, setGhostMode] = useState(false);
  const [showAddPin, setShowAddPin] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

  // Auth & Location
  const { user } = useAuth();
  const { latitude, longitude } = useGeolocation(!ghostMode);

  // Map engine state - use ref for setIdle to keep callback stable
  const mapEngine = useMapEngineState();
  const setIdleRef = useRef(mapEngine.setIdle);
  setIdleRef.current = mapEngine.setIdle;

  // Data hooks
  const { markers, loading: markersLoading, refetch: refetchMarkers } = useMapMarkers({
    bounds: null,
    isIdle: mapEngine.isIdle,
    enabled: true,
  });

  const { alerts } = useMapAlerts({ enabled: true });

  // Selected marker state
  const {
    selectedMarker,
    selectionMode,
    showPreview,
    clearSelection,
    promoteToDetail,
  } = useSelectedMarker();

  // Notification hooks
  const { playAlertSound, triggerVibration } = useNotificationAlerts();

  // CRITICAL: Memoize allAlerts to prevent MapboxMap re-renders
  const allAlerts = useMemo(() => [
    ...markers.map((m) => ({
      id: m.id,
      latitude: m.latitude,
      longitude: m.longitude,
      type: m.type,
      status: m.status,
      created_at: m.created_at,
      description: m.description,
    })),
    ...alerts.map((a) => ({
      id: a.id,
      latitude: a.latitude,
      longitude: a.longitude,
      type: a.type,
      status: a.status,
      created_at: a.created_at,
      description: a.description,
    })),
  ], [markers, alerts]);

  // Memoize incidents prop for MapboxMap
  const mapIncidents = useMemo(() =>
    allAlerts.map((a) => ({
      ...a,
      verified: false,
      confidence_score: 50,
    })),
    [allAlerts]
  );

  const { nearbyAlert, isHighPriority, dismissAlert } = useNearbyAlerts({
    userLat: latitude,
    userLng: longitude,
    alerts: allAlerts,
    radiusMeters: 500,
  });

  // Trigger audio/vibration for high-priority nearby alerts
  useEffect(() => {
    if (nearbyAlert && isHighPriority) {
      playAlertSound("high");
      triggerVibration("high");
    }
  }, [nearbyAlert?.id, isHighPriority, playAlertSound, triggerVibration]);

  // CRITICAL: Stable callback - no dependency on mapEngine object
  const handleMapLoad = useCallback((map: mapboxgl.Map) => {
    mapInstanceRef.current = map;
    setIdleRef.current();
  }, []);

  const handleGhostToggle = useCallback(async () => {
    if (!user) return;

    const newGhostMode = !ghostMode;
    setGhostMode(newGhostMode);

    await supabase
      .from("profiles")
      .update({ ghost_mode: newGhostMode })
      .eq("id", user.id);

    toast.info(newGhostMode ? "Ghost mode enabled" : "Ghost mode disabled");
  }, [user, ghostMode]);

  // Use ref for showAddPin to keep handleMapClick stable
  const showAddPinRef = useRef(showAddPin);
  showAddPinRef.current = showAddPin;

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (showAddPinRef.current) {
        setSelectedLocation({ lat, lng });
      }
    },
    []
  );

  // Use ref for markers/showPreview to keep handleMarkerClick stable
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const showPreviewRef = useRef(showPreview);
  showPreviewRef.current = showPreview;

  const handleMarkerClick = useCallback(
    (incident: { id: string; latitude: number; longitude: number; type: string; description?: string | null; status?: string; created_at?: string }) => {
      const fullMarker = markersRef.current.find((m) => m.id === incident.id);
      if (fullMarker) {
        showPreviewRef.current(fullMarker);
      } else {
        showPreviewRef.current({
          id: incident.id,
          latitude: incident.latitude,
          longitude: incident.longitude,
          type: incident.type,
          description: incident.description || null,
          user_id: "",
          created_at: incident.created_at || new Date().toISOString(),
          status: incident.status,
        } as MapMarker);
      }
    },
    []
  );

  const handleReportClick = useCallback((report: MapMarker) => {
    showPreview(report);
    promoteToDetail();
  }, [showPreview, promoteToDetail]);

  const handleAddIncidentToggle = useCallback(() => {
    setShowAddPin(prev => {
      if (!prev) {
        toast.info("Tap on the map to place your report", { duration: 3000 });
        return true;
      } else {
        setSelectedLocation(null);
        return false;
      }
    });
  }, []);

  const handleIncidentReportClose = useCallback(() => {
    setShowAddPin(false);
    setSelectedLocation(null);
  }, []);

  const handleIncidentReportSuccess = useCallback(() => {
    refetchMarkers();
  }, [refetchMarkers]);

  const handleViewNearbyOnMap = useCallback(() => {
    if (nearbyAlert) {
      const fullMarker = markers.find((m) => m.id === nearbyAlert.id);
      if (fullMarker) {
        showPreview(fullMarker);
      }
      dismissAlert(nearbyAlert.id);
    }
  }, [nearbyAlert, markers, showPreview, dismissAlert]);

  const handleRecenter = useCallback(() => {
    if (mapInstanceRef.current && latitude && longitude) {
      mapInstanceRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [latitude, longitude]);

  // Show nearby strip only when not adding pin
  const showNearbyStrip = !!nearbyAlert && !showAddPin && selectionMode === "none";

  return (
    <div className="min-h-screen bg-background">
      {/* Fullscreen Map */}
      <div className="relative h-screen w-full overflow-hidden">
        <MapboxMap
          className="absolute inset-0"
          showUserLocation={!ghostMode}
          incidents={mapIncidents}
          heatmapEnabled={heatmapEnabled}
          onMapLoad={handleMapLoad}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
        />

        {/* Floating top controls (back button only) */}
        <MapTopControls />

        {/* Near You Alert Strip */}
        <AnimatePresence>
          {showNearbyStrip && nearbyAlert && (
            <div className="fixed top-20 left-4 right-4 z-30">
              <NearYouStrip
                alert={nearbyAlert}
                isHighPriority={isHighPriority}
                onDismiss={() => dismissAlert(nearbyAlert.id)}
                onViewOnMap={handleViewNearbyOnMap}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Left floating controls */}
        <MapControls
          onRecenter={handleRecenter}
          onToggleLayers={() => setHeatmapEnabled(!heatmapEnabled)}
          layersActive={heatmapEnabled}
        />

        {/* Report FAB */}
        <ReportFab
          isActive={showAddPin}
          onClick={handleAddIncidentToggle}
        />

        {/* Crosshair for pin placement */}
        <CrosshairIndicator visible={showAddPin && !selectedLocation} />

        {/* Incident Report Modal */}
        <IncidentReportModal
          visible={showAddPin && !!selectedLocation}
          location={selectedLocation}
          onClose={handleIncidentReportClose}
          onSuccess={handleIncidentReportSuccess}
        />

        {/* Collapsible Bottom Sheet */}
        <ReportsBottomSheet
          reports={markers}
          userLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
          userId={user?.id}
          loading={markersLoading}
          onReportClick={handleReportClick}
          radiusMiles={2}
        />
      </div>

      {/* Incident Details Modal (full screen) */}
      <IncidentDetailsModal
        marker={selectionMode === "detail" ? selectedMarker : null}
        onClose={clearSelection}
        userLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
      />

      <BottomNav />
    </div>
  );
};

export default Map;

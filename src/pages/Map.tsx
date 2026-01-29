/**
 * Map Page - Refactored
 * Production-ready map screen with clean state management
 * Uses dedicated hooks for data fetching and UI components
 */

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import MapboxMap from "@/components/MapboxMap";
import IncidentDetailsModal from "@/components/IncidentDetailsModal";

// Map-specific components
import { MapStatusBar } from "@/components/map/MapStatusBar";
import { MapControls } from "@/components/map/MapControls";
import { MapLegend } from "@/components/map/MapLegend";
import { MapBottomSheet, type SheetState } from "@/components/map/MapBottomSheet";
import { NearYouStrip } from "@/components/map/NearYouStrip";
import { HeatmapToggle } from "@/components/map/HeatmapToggle";
import { ActiveTripBanner } from "@/components/map/ActiveTripBanner";
import { IncidentReportModal } from "@/components/map/IncidentReportModal";
import { CrosshairIndicator } from "@/components/map/CrosshairIndicator";

// Hooks
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyAlerts } from "@/hooks/useNearbyAlerts";
import { useNotificationAlerts } from "@/hooks/useNotificationAlerts";
import { useMapEngineState } from "@/hooks/useMapEngineState";
import { useMapMarkers, type MapMarker } from "@/hooks/useMapMarkers";
import { useMapAlerts } from "@/hooks/useMapAlerts";
import { useActiveTrip } from "@/hooks/useActiveTrip";
import { useWatcherLocations } from "@/hooks/useWatcherLocations";
import { useSelectedMarker } from "@/hooks/useSelectedMarker";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Map = () => {
  // UI State
  const [ghostMode, setGhostMode] = useState(false);
  const [showAddPin, setShowAddPin] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [bottomSheetState, setBottomSheetState] = useState<SheetState>("HIDDEN");

  // Auth & Location
  const { user } = useAuth();
  const { latitude, longitude } = useGeolocation(!ghostMode);

  // Map engine state
  const mapEngine = useMapEngineState();

  // Data hooks - all fetching is now centralized
  const { markers, refetch: refetchMarkers } = useMapMarkers({
    bounds: null, // We fetch all markers, not bound-limited for now
    isIdle: mapEngine.isIdle,
    enabled: true,
  });

  const { alerts } = useMapAlerts({ enabled: true });

  const { activeTrip, routes, hasActiveTrip } = useActiveTrip({
    userLat: latitude,
    userLng: longitude,
  });

  const { locations: watcherLocations, count: watcherCount } = useWatcherLocations();

  // Selected marker state
  const {
    selectedMarker,
    selectionMode,
    showPreview,
    promoteToDetail,
    clearSelection,
    clearPreview,
  } = useSelectedMarker();

  // Notification hooks
  const { playAlertSound, triggerVibration } = useNotificationAlerts();

  // Combine markers and alerts for nearby detection and map display
  const allAlerts = [
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
  ];

  const { nearbyAlert, isHighPriority, dismissAlert } = useNearbyAlerts({
    userLat: latitude,
    userLng: longitude,
    alerts: allAlerts,
    radiusMeters: 500,
  });

  // Count live/recent incidents
  const liveCount = allAlerts.filter((a) => {
    if (a.status === "resolved") return false;
    if (!a.created_at) return true;
    return Date.now() - new Date(a.created_at).getTime() < 30 * 60 * 1000;
  }).length;

  // Trigger audio/vibration for high-priority nearby alerts
  useEffect(() => {
    if (nearbyAlert && isHighPriority) {
      playAlertSound("high");
      triggerVibration("high");
    }
  }, [nearbyAlert?.id, isHighPriority, playAlertSound, triggerVibration]);

  // Sync bottom sheet state with selection
  useEffect(() => {
    if (selectionMode === "preview") {
      setBottomSheetState("PARTIAL");
    } else if (selectionMode === "detail") {
      setBottomSheetState("HIDDEN");
    } else {
      setBottomSheetState("HIDDEN");
    }
  }, [selectionMode]);

  // Handlers
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

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (showAddPin) {
        setSelectedLocation({ lat, lng });
      } else {
        // Clear selection when tapping empty map
        clearPreview();
      }
    },
    [showAddPin, clearPreview]
  );

  const handleMarkerClick = useCallback(
    (incident: { id: string; latitude: number; longitude: number; type: string; description?: string | null; status?: string; created_at?: string }) => {
      // Find full marker data
      const fullMarker = markers.find((m) => m.id === incident.id);
      if (fullMarker) {
        showPreview(fullMarker);
      } else {
        // It's an alert, create a temporary marker object
        showPreview({
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
    [markers, showPreview]
  );

  const handleAddIncidentToggle = useCallback(() => {
    if (!showAddPin) {
      setShowAddPin(true);
      toast.info("Tap on the map to place your report", { duration: 3000 });
    } else {
      setShowAddPin(false);
      setSelectedLocation(null);
    }
  }, [showAddPin]);

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

  const handleBottomSheetClose = useCallback(() => {
    setBottomSheetState("HIDDEN");
    clearSelection();
  }, [clearSelection]);

  const handleViewDetails = useCallback(() => {
    promoteToDetail();
    setBottomSheetState("HIDDEN");
  }, [promoteToDetail]);

  // Show banners only when no other overlays are active
  const showActiveTripBanner = hasActiveTrip && !showAddPin && !nearbyAlert && selectionMode === "none";
  const showNearbyStrip = !!nearbyAlert && !showAddPin && selectionMode === "none";

  return (
    <div className="min-h-screen bg-background">
      {/* Map Container */}
      <div className="relative h-[calc(100vh-4rem)]">
        <MapboxMap
          className="absolute inset-0"
          showUserLocation={!ghostMode}
          incidents={allAlerts.map((a) => ({
            ...a,
            verified: false,
            confidence_score: 50,
          }))}
          routes={routes}
          watchers={watcherLocations}
          heatmapEnabled={heatmapEnabled}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
        />

        {/* Top Status Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 z-10">
          <MapStatusBar
            ghostMode={ghostMode}
            onGhostToggle={handleGhostToggle}
            latitude={latitude}
            longitude={longitude}
            liveCount={liveCount}
          />
        </div>

        {/* Near You Alert Strip */}
        <AnimatePresence>
          {showNearbyStrip && nearbyAlert && (
            <div className="absolute top-20 left-0 right-0 z-20">
              <NearYouStrip
                alert={nearbyAlert}
                isHighPriority={isHighPriority}
                onDismiss={() => dismissAlert(nearbyAlert.id)}
                onViewOnMap={handleViewNearbyOnMap}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Active Trip Banner */}
        <ActiveTripBanner
          trip={activeTrip}
          visible={showActiveTripBanner}
          className="absolute top-20 left-4 right-4 z-10"
        />

        {/* Right Side Controls */}
        <div className="absolute right-4 bottom-28 z-10">
          <div className="flex flex-col gap-3">
            <HeatmapToggle
              enabled={heatmapEnabled}
              onToggle={() => setHeatmapEnabled(!heatmapEnabled)}
            />
            <MapControls
              onToggleLayers={() => setShowLegend(!showLegend)}
              onAddIncident={handleAddIncidentToggle}
              isAddingIncident={showAddPin}
            />
          </div>
        </div>

        {/* Legend Panel */}
        <MapLegend
          visible={showLegend}
          onClose={() => setShowLegend(false)}
          watcherCount={watcherCount}
          hasActiveRoute={routes.length > 0}
          className="absolute right-4 top-20 z-20"
        />

        {/* Crosshair when adding pin */}
        <CrosshairIndicator visible={showAddPin && !selectedLocation} />

        {/* Incident Report Modal */}
        <IncidentReportModal
          visible={showAddPin && !!selectedLocation}
          location={selectedLocation}
          onClose={handleIncidentReportClose}
          onSuccess={handleIncidentReportSuccess}
        />

        {/* Bottom Sheet for marker preview */}
        <MapBottomSheet
          marker={selectedMarker}
          userLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
          state={bottomSheetState}
          onStateChange={setBottomSheetState}
          onClose={handleBottomSheetClose}
          onViewDetails={handleViewDetails}
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

/**
 * Map Page - CityVoice-style UI
 * Clean map layout with reports bottom sheet
 */

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import MapboxMap from "@/components/MapboxMap";
import IncidentDetailsModal from "@/components/IncidentDetailsModal";

// Map-specific components
import { MapHeader } from "@/components/map/MapHeader";
import { MapControls } from "@/components/map/MapControls";
import { MapLegend } from "@/components/map/MapLegend";
import { ReportsBottomSheet } from "@/components/map/ReportsBottomSheet";
import { ReportFab } from "@/components/map/ReportFab";
import { HeatmapToggle } from "@/components/map/HeatmapToggle";
import { ActiveTripBanner } from "@/components/map/ActiveTripBanner";
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
  const [locationName, setLocationName] = useState("Your Location");

  // Auth & Location
  const { user } = useAuth();
  const { latitude, longitude } = useGeolocation(!ghostMode);

  // Map engine state
  const mapEngine = useMapEngineState();

  // Data hooks
  const { markers, loading: markersLoading, refetch: refetchMarkers } = useMapMarkers({
    bounds: null,
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

  // Combine markers and alerts for display
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

  // Trigger audio/vibration for high-priority nearby alerts
  useEffect(() => {
    if (nearbyAlert && isHighPriority) {
      playAlertSound("high");
      triggerVibration("high");
    }
  }, [nearbyAlert?.id, isHighPriority, playAlertSound, triggerVibration]);

  // Update location name based on coordinates (reverse geocoding could be added)
  useEffect(() => {
    if (latitude && longitude) {
      // Simple location label - could use reverse geocoding API
      setLocationName("Your Location");
    }
  }, [latitude, longitude]);

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
        clearPreview();
      }
    },
    [showAddPin, clearPreview]
  );

  const handleMarkerClick = useCallback(
    (incident: { id: string; latitude: number; longitude: number; type: string; description?: string | null; status?: string; created_at?: string }) => {
      const fullMarker = markers.find((m) => m.id === incident.id);
      if (fullMarker) {
        showPreview(fullMarker);
      } else {
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

  const handleReportClick = useCallback((report: MapMarker) => {
    showPreview(report);
    promoteToDetail();
  }, [showPreview, promoteToDetail]);

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

  // Show banners only when no other overlays are active
  const showActiveTripBanner = hasActiveTrip && !showAddPin && !nearbyAlert && selectionMode === "none";
  const showNearbyStrip = !!nearbyAlert && !showAddPin && selectionMode === "none";

  return (
    <div className="min-h-screen bg-background">
      {/* Map Container - Full height */}
      <div className="relative h-screen w-full overflow-hidden">
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

        {/* Top Header */}
        <MapHeader locationName={locationName} />

        {/* Near You Alert Strip */}
        <AnimatePresence>
          {showNearbyStrip && nearbyAlert && (
            <div className="fixed top-20 left-4 right-4 z-20">
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
          className="fixed top-20 left-4 right-4 z-10"
        />

        {/* Left Side Controls */}
        <MapControls
          onRecenter={() => {}}
          onSettings={() => setShowLegend(!showLegend)}
          onToggleLayers={() => setHeatmapEnabled(!heatmapEnabled)}
        />

        {/* Report FAB - Right side */}
        <ReportFab
          isActive={showAddPin}
          onClick={handleAddIncidentToggle}
        />

        {/* Legend Panel */}
        <MapLegend
          visible={showLegend}
          onClose={() => setShowLegend(false)}
          watcherCount={watcherCount}
          hasActiveRoute={routes.length > 0}
          className="fixed right-4 top-20 z-20"
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

        {/* Reports Bottom Sheet */}
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

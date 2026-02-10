/**
 * Map Page - Clean fullscreen map with floating controls
 * Map is the hero, everything floats on top
 * 
 * CRITICAL: All callbacks passed to MapboxMap must be stable refs
 * to prevent the map from re-initializing on every render.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import MapboxMap from "@/components/MapboxMap";
import IncidentDetailsModal from "@/components/IncidentDetailsModal";

// Map-specific components
import { MapTopControls } from "@/components/map/MapTopControls";
import { MapControls } from "@/components/map/MapControls";
import { MapSearchBar } from "@/components/map/MapSearchBar";
import { MapLegend } from "@/components/map/MapLegend";
import { MapSkeleton } from "@/components/map/MapSkeleton";
import { ReportsBottomSheet } from "@/components/map/ReportsBottomSheet";
import { ReportFab } from "@/components/map/ReportFab";
import { IncidentReportModal } from "@/components/map/IncidentReportModal";
import { CrosshairIndicator } from "@/components/map/CrosshairIndicator";
import { ActiveTripBanner } from "@/components/map/ActiveTripBanner";
import { NearYouStrip } from "@/components/map/NearYouStrip";
import { UserAvatarMarkers } from "@/components/map/UserAvatarMarkers";
import { LiveLocationLabel } from "@/components/map/LiveLocationLabel";
import { GhostModeToggle } from "@/components/map/GhostModeToggle";
import { UserLocationsList } from "@/components/map/UserLocationsList";
import { SpeedCompass } from "@/components/map/SpeedCompass";
import { QuickActionsMenu } from "@/components/map/QuickActionsMenu";
import { PanicAlertMapLayer } from "@/components/map/PanicAlertMapLayer";
import { LookAfterMeMapLayer } from "@/components/map/LookAfterMeMapLayer";

// Hooks
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyAlerts } from "@/hooks/useNearbyAlerts";
import { useNotificationAlerts } from "@/hooks/useNotificationAlerts";
import { useMapEngineState } from "@/hooks/useMapEngineState";
import { useMapMarkers, type MapMarker } from "@/hooks/useMapMarkers";
import { useMapAlerts } from "@/hooks/useMapAlerts";
import { useSelectedMarker } from "@/hooks/useSelectedMarker";
import { useRealtimeLocations, type UserLocation } from "@/hooks/useRealtimeLocations";
import { useLocationTracking } from "@/hooks/useLocationTracking";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Map = () => {
  // URL params for navigating to specific location
  const [searchParams] = useSearchParams();

  // UI State
  const [ghostMode, setGhostMode] = useState(false);
  const [showAddPin, setShowAddPin] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const hasNavigatedToParams = useRef(false);

  // Auth & Location
  const { user } = useAuth();
  const { latitude, longitude } = useGeolocation(!ghostMode);

  // Map engine state
  const mapEngine = useMapEngineState();
  const setIdleRef = useRef(mapEngine.setIdle);
  setIdleRef.current = mapEngine.setIdle;

  // Real-time user locations
  const { locations: userLocations } = useRealtimeLocations();

  // Track current user's location
  useLocationTracking({
    enabled: !!user && !ghostMode,
    ghostMode,
    updateInterval: 10000,
  });

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

  // CRITICAL: Memoize allAlerts
  const allAlerts = useMemo(() => [
    ...markers.map((m) => ({
      id: m.id, latitude: m.latitude, longitude: m.longitude,
      type: m.type, status: m.status, created_at: m.created_at, description: m.description,
    })),
    ...alerts.map((a) => ({
      id: a.id, latitude: a.latitude, longitude: a.longitude,
      type: a.type, status: a.status, created_at: a.created_at, description: a.description,
    })),
  ], [markers, alerts]);

  const mapIncidents = useMemo(() =>
    allAlerts.map((a) => ({ ...a, verified: false, confidence_score: 50 })),
    [allAlerts]
  );

  const { nearbyAlert, isHighPriority, dismissAlert } = useNearbyAlerts({
    userLat: latitude, userLng: longitude,
    alerts: allAlerts, radiusMeters: 500,
  });

  // Trigger audio/vibration for high-priority nearby alerts
  useEffect(() => {
    if (nearbyAlert && isHighPriority) {
      playAlertSound("high");
      triggerVibration("high");
    }
  }, [nearbyAlert?.id, isHighPriority, playAlertSound, triggerVibration]);

  // Device orientation for compass
  useEffect(() => {
    if (!("DeviceOrientationEvent" in window)) return;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) setHeading(360 - event.alpha);
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  // Track speed from geolocation
  useEffect(() => {
    if (!latitude || !longitude) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setSpeed(pos.coords.speed || 0),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [!!latitude, !!longitude]);

  // CRITICAL: Stable callbacks
  const handleMapLoad = useCallback((map: mapboxgl.Map) => {
    mapInstanceRef.current = map;
    setIdleRef.current();
  }, []);

  // Navigate to URL params (from "View on Map" in LivePanicFeed)
  useEffect(() => {
    if (!mapInstanceRef.current || hasNavigatedToParams.current || !mapEngine.isIdle) return;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const zoom = searchParams.get("zoom");
    if (lat && lng) {
      hasNavigatedToParams.current = true;
      mapInstanceRef.current.flyTo({
        center: [parseFloat(lng), parseFloat(lat)],
        zoom: zoom ? parseFloat(zoom) : 16,
        duration: 1500,
      });
    }
  }, [searchParams, mapEngine.isIdle]);

  const handleGhostToggle = useCallback(async (enabled: boolean) => {
    if (!user) return;
    setGhostMode(enabled);
    await supabase.from("profiles").update({ ghost_mode: enabled }).eq("id", user.id);
    toast.info(enabled ? "👻 Ghost mode enabled" : "📍 Location visible to others");
  }, [user]);

  const showAddPinRef = useRef(showAddPin);
  showAddPinRef.current = showAddPin;

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (showAddPinRef.current) setSelectedLocation({ lat, lng });
  }, []);

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
          id: incident.id, latitude: incident.latitude, longitude: incident.longitude,
          type: incident.type, description: incident.description || null, user_id: "",
          created_at: incident.created_at || new Date().toISOString(), status: incident.status,
        } as MapMarker);
      }
    }, []
  );

  const handleReportClick = useCallback((report: MapMarker) => {
    showPreview(report);
    promoteToDetail();
  }, [showPreview, promoteToDetail]);

  const handleAddIncidentToggle = useCallback(() => {
    setShowAddPin((prev) => {
      if (!prev) {
        toast.info("Tap on the map to place your report", { duration: 3000 });
        return true;
      } else {
        setSelectedLocation(null);
        return false;
      }
    });
  }, []);

  const handleRecenter = useCallback(() => {
    if (mapInstanceRef.current && latitude && longitude) {
      mapInstanceRef.current.flyTo({ center: [longitude, latitude], zoom: 15, duration: 1000 });
    }
  }, [latitude, longitude]);

  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn({ duration: 300 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut({ duration: 300 });
  }, []);

  const handleSearchSelect = useCallback((lat: number, lng: number, zoom?: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: zoom || 15, duration: 1000 });
    }
  }, []);

  const handleUserSelect = useCallback((location: UserLocation) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({ center: [location.longitude, location.latitude], zoom: 15, duration: 1000 });
    }
  }, []);

  const handleViewNearbyOnMap = useCallback(() => {
    if (nearbyAlert) {
      const fullMarker = markers.find((m) => m.id === nearbyAlert.id);
      if (fullMarker) showPreview(fullMarker);
      dismissAlert(nearbyAlert.id);
    }
  }, [nearbyAlert, markers, showPreview, dismissAlert]);

  const showNearbyStrip = !!nearbyAlert && !showAddPin && selectionMode === "none";

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-screen w-full overflow-hidden">
        {/* Map loading skeleton */}
        {!mapEngine.isIdle && <MapSkeleton />}

        {/* Fullscreen Map */}
        <MapboxMap
          className="absolute inset-0"
          showUserLocation={!ghostMode}
          incidents={mapIncidents}
          heatmapEnabled={heatmapEnabled}
          onMapLoad={handleMapLoad}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
        />

        {/* User Avatar Markers */}
        <UserAvatarMarkers
          map={mapInstanceRef.current}
          locations={userLocations}
          currentUserId={user?.id}
          onUserClick={handleUserSelect}
        />

        {/* Panic Alert Live Layer */}
        <PanicAlertMapLayer
          map={mapInstanceRef.current}
          currentUserId={user?.id}
        />

        {/* Look After Me Tracking Layer */}
        <LookAfterMeMapLayer map={mapInstanceRef.current} />

        {/* Floating top controls (back button) */}
        <MapTopControls />

        {/* Active Trip Banner */}
        <ActiveTripBanner className="fixed top-[calc(var(--map-top-row)+44px+var(--map-element-gap))] left-[var(--map-inset)] right-[var(--map-inset)] z-20" />

        {/* Enhanced Search Bar */}
        <MapSearchBar
          onLocationSelect={handleSearchSelect}
          incidents={allAlerts}
        />

        {/* Map Legend */}
        <MapLegend />

        {/* Live Location Label */}
        {latitude && longitude && !ghostMode && (
          <LiveLocationLabel
            latitude={latitude}
            longitude={longitude}
            isMoving={speed > 0.5}
            speed={speed}
          />
        )}

        {/* Speed & Compass */}
        <SpeedCompass heading={heading} speed={speed} />

        {/* Ghost Mode Toggle - right side, second row */}
        <div className="fixed top-[calc(var(--map-top-row)+44px+var(--map-element-gap))] right-[var(--map-inset)] z-20">
          <GhostModeToggle isGhost={ghostMode} onChange={handleGhostToggle} />
        </div>

        {/* User Locations List */}
        <UserLocationsList
          locations={userLocations}
          currentUserLocation={latitude && longitude ? { lat: latitude, lng: longitude } : undefined}
          onUserSelect={handleUserSelect}
        />

        {/* Near You Alert Strip */}
        <AnimatePresence>
          {showNearbyStrip && nearbyAlert && (
            <div className="fixed top-[calc(var(--map-top-row)+44px+var(--map-element-gap))] left-[var(--map-inset)] right-[var(--map-inset)] z-30">
              <NearYouStrip
                alert={nearbyAlert}
                isHighPriority={isHighPriority}
                onDismiss={() => dismissAlert(nearbyAlert.id)}
                onViewOnMap={handleViewNearbyOnMap}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Left floating controls (zoom + recenter + layers) */}
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRecenter={handleRecenter}
          onToggleLayers={() => setHeatmapEnabled(!heatmapEnabled)}
          layersActive={heatmapEnabled}
        />

        {/* Quick Actions Menu */}
        <QuickActionsMenu
          onReportIncident={handleAddIncidentToggle}
          onEmergencyCall={() => window.open("tel:10111")}
          onShareLocation={() => {
            if (latitude && longitude) {
              navigator.share?.({
                title: "My Location",
                url: `https://www.google.com/maps?q=${latitude},${longitude}`,
              }).catch(() => {});
            }
          }}
          onToggleWatchers={() => toast.info("Watchers feature coming soon")}
        />

        {/* Report FAB */}
        <ReportFab isActive={showAddPin} onClick={handleAddIncidentToggle} />

        {/* Crosshair for pin placement */}
        <CrosshairIndicator visible={showAddPin && !selectedLocation} />

        {/* Incident Report Modal */}
        <IncidentReportModal
          visible={showAddPin && !!selectedLocation}
          location={selectedLocation}
          onClose={() => { setShowAddPin(false); setSelectedLocation(null); }}
          onSuccess={refetchMarkers}
        />

        {/* Collapsible Bottom Sheet with snap points */}
        <ReportsBottomSheet
          reports={markers}
          userLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
          userId={user?.id}
          loading={markersLoading}
          onReportClick={handleReportClick}
          onRefresh={refetchMarkers}
          radiusMiles={2}
        />
      </div>

      {/* Incident Details Modal */}
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

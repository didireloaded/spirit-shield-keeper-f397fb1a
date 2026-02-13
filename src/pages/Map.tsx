/**
 * Map Page - Clean fullscreen map with floating controls
 * Map is the hero, everything floats on top
 * 
 * MOBILE: Native-style layout with unified top bar, single right control stack,
 * draggable bottom sheet, and floating report FAB.
 * DESKTOP: Richer layout with scattered controls preserved.
 * 
 * CRITICAL: All callbacks passed to MapboxMap must be stable refs
 * to prevent the map from re-initializing on every render.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useIncidentPriority, useCalmState } from "@/hooks/useIncidentPriority";
import { CalmBanner } from "@/components/map/CalmBanner";
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
import { IncidentReportModal } from "@/components/map/IncidentReportModal";
import { CrosshairIndicator } from "@/components/map/CrosshairIndicator";
import { NearYouStrip } from "@/components/map/NearYouStrip";
import { UserAvatarMarkers } from "@/components/map/UserAvatarMarkers";
import { LiveLocationLabel } from "@/components/map/LiveLocationLabel";
import { GhostModeToggle } from "@/components/map/GhostModeToggle";
import { UserLocationsList } from "@/components/map/UserLocationsList";
import { SpeedCompass } from "@/components/map/SpeedCompass";
import { QuickActionsMenu } from "@/components/map/QuickActionsMenu";
import { PanicAlertMapLayer } from "@/components/map/PanicAlertMapLayer";
import { LookAfterMeMapLayer } from "@/components/map/LookAfterMeMapLayer";
import { AmberAlertMapLayer } from "@/components/map/AmberAlertMapLayer";

// Mobile-native components
import { MobileMapTopBar } from "@/components/map/MobileMapTopBar";
import { MobileMapControls } from "@/components/map/MobileMapControls";
import { MobileReportFab } from "@/components/map/MobileReportFab";

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
import { useIsMobile } from "@/hooks/use-mobile";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Map = () => {
  const isMobile = useIsMobile();

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
  const mapLoadedRef = useRef(false);
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

  // Incident priority & calm state
  const userLocationObj = useMemo(
    () => (latitude && longitude ? { lat: latitude, lng: longitude } : null),
    [latitude, longitude]
  );

  const { focusedIncident, focusedScore, isNight } = useIncidentPriority({
    mapRef: mapInstanceRef as any,
    mapLoadedRef,
    incidents: allAlerts,
    userLocation: userLocationObj,
  });

  const isCalm = useCalmState(allAlerts, userLocationObj);

  // Trigger audio/vibration for high-priority nearby alerts
  useEffect(() => {
    if (nearbyAlert && isHighPriority) {
      playAlertSound("high");
      triggerVibration("high");
    }
  }, [nearbyAlert?.id, isHighPriority, playAlertSound, triggerVibration]);

  // Device orientation for compass (desktop only)
  useEffect(() => {
    if (isMobile) return; // Skip compass on mobile
    if (!("DeviceOrientationEvent" in window)) return;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) setHeading(360 - event.alpha);
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [isMobile]);

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
    mapLoadedRef.current = true;
    setIdleRef.current();
  }, []);

  // Navigate to URL params
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
        {/* ── L8: BASE MAP ── */}
        {!mapEngine.isIdle && <MapSkeleton />}

        {/* ── L8: FULLSCREEN MAP ── */}
        <MapboxMap
          className="absolute inset-0"
          showUserLocation={!ghostMode}
          incidents={mapIncidents}
          heatmapEnabled={heatmapEnabled}
          onMapLoad={handleMapLoad}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
        />

        {/* ── L6: MAP MARKERS & LIVE TRACKING ── */}
        <UserAvatarMarkers
          map={mapInstanceRef.current}
          locations={userLocations}
          currentUserId={user?.id}
          onUserClick={handleUserSelect}
        />

        {/* L6: Panic Alert Live Layer */}
        <PanicAlertMapLayer
          map={mapInstanceRef.current}
          currentUserId={user?.id}
        />

        {/* L6: Look After Me Tracking Layer */}
        <LookAfterMeMapLayer map={mapInstanceRef.current} />

        {/* L6: Amber Alert Markers */}
        <AmberAlertMapLayer map={mapInstanceRef.current} />

        {/* ═══════════════════════════════════════════════
            MOBILE LAYOUT — Native-style, minimal, grouped
            ═══════════════════════════════════════════════ */}
        {isMobile ? (
          <>
            {/* 1️⃣ UNIFIED TOP BAR: Back | Search | Ghost | Info */}
            <MobileMapTopBar
              isGhost={ghostMode}
              onGhostToggle={handleGhostToggle}
              onLocationSelect={handleSearchSelect}
              incidents={allAlerts}
            />

            {/* 2️⃣ RIGHT-SIDE CONTROL STACK: Zoom In, Zoom Out, Locate */}
            <MobileMapControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onRecenter={handleRecenter}
            />

            {/* 3️⃣ REPORT FAB: Above bottom sheet, bottom-right */}
            <MobileReportFab onPress={handleAddIncidentToggle} />

            {/* 4️⃣ CALM BANNER (mobile) — only when no nearby threats */}
            <AnimatePresence>
              {isCalm && !showAddPin && selectionMode === "none" && (
                <div
                  className="fixed left-1/2 -translate-x-1/2 z-[var(--z-map-feedback)]"
                  style={{ top: "calc(env(safe-area-inset-top, 0px) + 64px)" }}
                >
                  <CalmBanner />
                </div>
              )}
            </AnimatePresence>

            {/* 5️⃣ NEAR YOU ALERT (Panic only on mobile — no banners otherwise) */}
            <AnimatePresence>
              {showNearbyStrip && nearbyAlert && isHighPriority && (
                <div
                  className="fixed left-4 right-4 z-[var(--z-map-critical)]"
                  style={{ top: "calc(env(safe-area-inset-top, 0px) + 64px)" }}
                >
                  <NearYouStrip
                    alert={nearbyAlert}
                    isHighPriority={isHighPriority}
                    onDismiss={() => dismissAlert(nearbyAlert.id)}
                    onViewOnMap={handleViewNearbyOnMap}
                  />
                </div>
              )}
            </AnimatePresence>
          </>
        ) : (
          /* ═══════════════════════════════════════════════
             DESKTOP LAYOUT — Richer, more controls
             ═══════════════════════════════════════════════ */
          <>
            {/* TOP ROW: Back (left) · Search (center) · Legend (right) */}
            <div className="fixed top-[var(--map-top-row)] left-[var(--map-inset)] z-[var(--z-map-controls)] pointer-events-auto">
              <MapTopControls />
            </div>

            <MapSearchBar
              onLocationSelect={handleSearchSelect}
              incidents={allAlerts}
            />

            <MapLegend />

            {/* SECOND ROW: Online users (left) · Ghost mode (right) */}
            <UserLocationsList
              locations={userLocations}
              currentUserLocation={latitude && longitude ? { lat: latitude, lng: longitude } : undefined}
              onUserSelect={handleUserSelect}
            />

            <div className="fixed top-[calc(var(--map-top-row)+44px+8px)] right-[var(--map-inset)] z-[var(--z-map-controls)] flex flex-col items-end gap-2">
              <GhostModeToggle isGhost={ghostMode} onChange={handleGhostToggle} />
              <SpeedCompass heading={heading} speed={speed} />
            </div>

            {/* Contextual feedback */}
            {latitude && longitude && !ghostMode && (
              <LiveLocationLabel
                latitude={latitude}
                longitude={longitude}
                isMoving={speed > 0.5}
                speed={speed}
              />
            )}

            {/* Calm Banner (desktop) */}
            <AnimatePresence>
              {isCalm && !showAddPin && selectionMode === "none" && (
                <div className="fixed top-[calc(var(--map-top-row)+100px)] left-1/2 -translate-x-1/2 z-[var(--z-map-feedback)]">
                  <CalmBanner />
                </div>
              )}
            </AnimatePresence>

            {/* Near You Alert Strip */}
            <AnimatePresence>
              {showNearbyStrip && nearbyAlert && (
                <div className="fixed top-[calc(var(--map-top-row)+100px)] left-[var(--map-inset)] right-[var(--map-inset)] z-[var(--z-map-critical)]">
                  <NearYouStrip
                    alert={nearbyAlert}
                    isHighPriority={isHighPriority}
                    onDismiss={() => dismissAlert(nearbyAlert.id)}
                    onViewOnMap={handleViewNearbyOnMap}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Right-side map controls */}
            <MapControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onRecenter={handleRecenter}
              onToggleLayers={() => setHeatmapEnabled(!heatmapEnabled)}
              layersActive={heatmapEnabled}
            />

            {/* Quick Actions FAB */}
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
          </>
        )}

        {/* Crosshair for pin placement */}
        <CrosshairIndicator visible={showAddPin && !selectedLocation} />

        {/* ── L1: SYSTEM MODALS ── */}
        <IncidentReportModal
          visible={showAddPin && !!selectedLocation}
          location={selectedLocation}
          onClose={() => { setShowAddPin(false); setSelectedLocation(null); }}
          onSuccess={refetchMarkers}
        />

        {/* Bottom Sheet */}
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

      {/* L1: Incident Details Modal */}
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

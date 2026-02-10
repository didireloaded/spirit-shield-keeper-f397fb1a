/**
 * NotificationDispatcher
 * 
 * The SINGLE authoritative notification pipeline.
 * Listens to real-time streams → applies rules → dispatches to in-app + push.
 * 
 * RULES:
 * - Panic started       → critical push + in-app
 * - Panic movement      → silent (map only, NO push, NO in-app)
 * - Panic ended         → important in-app only
 * - Incident near you   → important push + in-app (once per incident)
 * - Incident status     → info in-app only (once per status change)
 * - Amber alert         → important push + in-app (community only)
 * - LookAfterMe start   → info in-app (watchers only)
 * - LookAfterMe end     → info in-app (watchers only)
 * - Comments            → info in-app only
 * 
 * DEDUPLICATION:
 * - Keyed by `${relatedType}_${relatedId}_${eventType}`
 * - 5-minute cooldown per key
 * 
 * THROTTLING:
 * - Max 1 push per 30 seconds globally
 * - Panic started bypasses throttle
 */

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useNotificationAlerts } from "@/hooks/useNotificationAlerts";
import { distanceInMeters } from "@/lib/geo";
import {
  getPanicStartedCopy,
  getPanicEndedCopy,
  getIncidentNearCopy,
  getIncidentStatusCopy,
  getAmberAlertCopy,
  getLookAfterMeStartCopy,
  getLookAfterMeEndCopy,
} from "@/lib/notificationCopy";

interface DispatchEvent {
  eventType: string;
  relatedType: "panic" | "incident" | "amber" | "lookAfterMe";
  relatedId: string;
  title: string;
  body: string;
  priority: "critical" | "important" | "info";
  url: string;
  lat?: number;
  lng?: number;
  placeName?: string;
}

// Dedup cooldown in ms
const DEDUP_COOLDOWN_MS = 5 * 60 * 1000;
// Global push throttle in ms (panic bypasses)
const PUSH_THROTTLE_MS = 30 * 1000;

export function useNotificationDispatcher() {
  const { user } = useAuth();
  const { shouldNotify } = useNotificationSettings();
  const { triggerAlert, triggerEmergencyAlert } = useNotificationAlerts();

  // Dedup map: key → last dispatched timestamp
  const dedupMap = useRef<Map<string, number>>(new Map());
  // Last push timestamp
  const lastPushAt = useRef<number>(0);
  // Track which panic/incident IDs we've already notified for (session-level)
  const notifiedPanicIds = useRef<Set<string>>(new Set());
  const notifiedIncidentIds = useRef<Set<string>>(new Set());
  const notifiedAmberIds = useRef<Set<string>>(new Set());
  // User's current location for geo-filtering
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Keep user location updated via geolocation watch
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        userLocationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Geo-filter: returns true if alert is within radius (or no user location available)
  const isWithinRadius = useCallback((alertLat: number, alertLng: number, radiusMeters: number): boolean => {
    const loc = userLocationRef.current;
    if (!loc) return true; // Can't filter, allow through
    return distanceInMeters(loc.lat, loc.lng, alertLat, alertLng) <= radiusMeters;
  }, []);

  const isDuplicate = useCallback((key: string): boolean => {
    const last = dedupMap.current.get(key);
    if (last && Date.now() - last < DEDUP_COOLDOWN_MS) return true;
    dedupMap.current.set(key, Date.now());
    return false;
  }, []);

  const canPush = useCallback((priority: string): boolean => {
    if (priority === "critical") return true; // Panic bypasses throttle
    if (Date.now() - lastPushAt.current < PUSH_THROTTLE_MS) return false;
    return true;
  }, []);

  const dispatch = useCallback(
    async (event: DispatchEvent) => {
      if (!user) return;

      // Dedup check
      const dedupKey = `${event.relatedType}_${event.relatedId}_${event.eventType}`;
      if (isDuplicate(dedupKey)) return;

      // Priority mapping for settings check
      const settingsPriority =
        event.priority === "critical" ? "high" : event.priority === "important" ? "normal" : "low";

      if (!shouldNotify(settingsPriority as "low" | "normal" | "high")) return;

      // In-app notification (always created for non-movement events)
      try {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: event.eventType,
          title: event.title,
          body: event.body,
          priority: settingsPriority,
          entity_id: event.relatedId,
          entity_type: event.relatedType,
          data: {
            url: event.url,
            relatedType: event.relatedType,
            relatedId: event.relatedId,
            placeName: event.placeName,
            lat: event.lat,
            lng: event.lng,
          },
          read: false,
        });
      } catch (err) {
        console.error("[Dispatcher] In-app insert failed:", err);
      }

      // Sound/vibration based on priority
      if (event.priority === "critical") {
        await triggerEmergencyAlert();
      } else if (event.priority === "important") {
        await triggerAlert("normal");
      }

      // Push notification (if allowed by throttle)
      if (
        event.priority !== "info" &&
        canPush(event.priority) &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.visibilityState !== "visible"
      ) {
        lastPushAt.current = Date.now();
        try {
          new Notification(event.title, {
            body: event.body,
            icon: "/favicon.ico",
            tag: dedupKey,
            data: {
              url: event.url,
              relatedType: event.relatedType,
              relatedId: event.relatedId,
            },
          });
        } catch {
          // Service worker will handle push when available
        }
      }
    },
    [user, isDuplicate, shouldNotify, triggerAlert, triggerEmergencyAlert, canPush]
  );

  // ===== STREAM LISTENERS =====

  useEffect(() => {
    if (!user) return;

    // --- PANIC STREAM ---
    const panicChannel = supabase
      .channel("dispatcher-panic")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "panic_sessions" },
        (payload) => {
          const s = payload.new as any;
          if (s.user_id === user.id) return; // Don't notify self
          if (notifiedPanicIds.current.has(s.id)) return;
          notifiedPanicIds.current.add(s.id);

          const copy = getPanicStartedCopy(
            s.location_name || s.current_location_name || "your area",
            s.id
          );
          dispatch({
            eventType: "panic_started",
            relatedType: "panic",
            relatedId: s.id,
            title: copy.title,
            body: copy.body,
            priority: "critical",
            url: copy.url,
            lat: s.initial_lat,
            lng: s.initial_lng,
            placeName: s.location_name,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "panic_sessions" },
        (payload) => {
          const s = payload.new as any;
          const old = payload.old as any;
          if (s.user_id === user.id) return;

          // Status changed to ended
          if (old.status === "active" && s.status !== "active") {
            const copy = getPanicEndedCopy(s.id);
            dispatch({
              eventType: "panic_ended",
              relatedType: "panic",
              relatedId: s.id,
              title: copy.title,
              body: copy.body,
              priority: "important",
              url: copy.url,
            });
          }
          // Movement updates are SILENT — no dispatch, map handles it
        }
      )
      .subscribe();

    // --- INCIDENT STREAM ---
    const incidentChannel = supabase
      .channel("dispatcher-incidents")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          const a = payload.new as any;
          if (a.user_id === user.id) return;
          if (a.type === "amber") return; // Amber handled separately
          if (notifiedIncidentIds.current.has(a.id)) return;
          notifiedIncidentIds.current.add(a.id);

          // Geo-filter: only notify if incident is within 10km
          if (!isWithinRadius(a.latitude, a.longitude, 10000)) return;

          const copy = getIncidentNearCopy("your area", a.id);
          dispatch({
            eventType: "incident_reported",
            relatedType: "incident",
            relatedId: a.id,
            title: copy.title,
            body: copy.body,
            priority: "important",
            url: copy.url,
            lat: a.latitude,
            lng: a.longitude,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alerts" },
        (payload) => {
          const a = payload.new as any;
          const old = payload.old as any;
          if (a.user_id === user.id) return;

          // Only notify on status transitions
          if (old.status !== a.status) {
            const copy = getIncidentStatusCopy(a.status, a.id);
            dispatch({
              eventType: "incident_status_changed",
              relatedType: "incident",
              relatedId: a.id,
              title: copy.title,
              body: copy.body,
              priority: a.status === "resolved" ? "info" : "important",
              url: copy.url,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "markers" },
        (payload) => {
          const m = payload.new as any;
          if (m.user_id === user.id) return;
          if (notifiedIncidentIds.current.has(m.id)) return;
          notifiedIncidentIds.current.add(m.id);

          // Geo-filter: only notify if marker is within 10km
          if (!isWithinRadius(m.latitude, m.longitude, 10000)) return;

          const copy = getIncidentNearCopy("your area", m.id);
          dispatch({
            eventType: "incident_reported",
            relatedType: "incident",
            relatedId: m.id,
            title: copy.title,
            body: copy.body,
            priority: "important",
            url: copy.url,
            lat: m.latitude,
            lng: m.longitude,
          });
        }
      )
      .subscribe();

    // --- AMBER ALERT STREAM ---
    const amberChannel = supabase
      .channel("dispatcher-amber")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts", filter: "type=eq.amber" },
        (payload) => {
          const a = payload.new as any;
          if (a.user_id === user.id) return;
          if (notifiedAmberIds.current.has(a.id)) return;
          notifiedAmberIds.current.add(a.id);

          const copy = getAmberAlertCopy(a.id);
          dispatch({
            eventType: "amber_alert",
            relatedType: "amber",
            relatedId: a.id,
            title: copy.title,
            body: copy.body,
            priority: "important",
            url: copy.url,
          });
        }
      )
      .subscribe();

    // --- LOOK AFTER ME STREAM ---
    const lamChannel = supabase
      .channel("dispatcher-look-after-me")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "safety_sessions" },
        (payload) => {
          const s = payload.new as any;
          if (s.user_id === user.id) return;
          const copy = getLookAfterMeStartCopy("Someone you watch");
          dispatch({
            eventType: "lam_started",
            relatedType: "lookAfterMe",
            relatedId: s.id,
            title: copy.title,
            body: copy.body,
            priority: "info",
            url: copy.url,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "safety_sessions" },
        (payload) => {
          const s = payload.new as any;
          const old = payload.old as any;
          if (s.user_id === user.id) return;
          if (
            (old.status === "active" || old.status === "late") &&
            (s.status === "arrived" || s.status === "cancelled")
          ) {
            const copy = getLookAfterMeEndCopy("Someone you watch");
            dispatch({
              eventType: "lam_ended",
              relatedType: "lookAfterMe",
              relatedId: s.id,
              title: copy.title,
              body: copy.body,
              priority: "info",
              url: copy.url,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(panicChannel);
      supabase.removeChannel(incidentChannel);
      supabase.removeChannel(amberChannel);
      supabase.removeChannel(lamChannel);
    };
  }, [user, dispatch]);
}

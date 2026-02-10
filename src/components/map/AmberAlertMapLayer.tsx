/**
 * Amber Alert Map Layer
 * Shows missing person alerts as calm, amber/yellow map markers
 * with informational popups. No pulsing, no urgency, no banners.
 */

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface AmberMapAlert {
  id: string;
  latitude: number;
  longitude: number;
  description: string | null;
  created_at: string;
  user_id: string;
  // Joined amber_alerts data
  missing_name?: string;
  last_seen_place?: string;
  last_seen_time?: string;
  photo_url?: string;
  missing_age?: number;
}

interface AmberAlertMapLayerProps {
  map: mapboxgl.Map | null;
}

export function AmberAlertMapLayer({ map }: AmberAlertMapLayerProps) {
  const [amberAlerts, setAmberAlerts] = useState<AmberMapAlert[]>([]);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Fetch active amber alerts
  useEffect(() => {
    const fetchAmberAlerts = async () => {
      // Fetch alerts of type amber
      const { data: alerts } = await supabase
        .from("alerts")
        .select("id, latitude, longitude, description, created_at, user_id")
        .eq("type", "amber")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!alerts || alerts.length === 0) {
        setAmberAlerts([]);
        return;
      }

      // Fetch amber_alerts details for enrichment
      const userIds = [...new Set(alerts.map((a) => a.user_id))];
      const { data: amberDetails } = await supabase
        .from("amber_alerts")
        .select("created_by, missing_name, last_seen_place, last_seen_time, photo_url, missing_age")
        .in("created_by", userIds)
        .eq("status", "active");

      const detailMap = new Map(
        amberDetails?.map((d) => [d.created_by, d]) || []
      );

      setAmberAlerts(
        alerts.map((a) => {
          const detail = detailMap.get(a.user_id);
          return {
            ...a,
            missing_name: detail?.missing_name,
            last_seen_place: detail?.last_seen_place,
            last_seen_time: detail?.last_seen_time,
            photo_url: detail?.photo_url,
            missing_age: detail?.missing_age,
          };
        })
      );
    };

    fetchAmberAlerts();

    const channel = supabase
      .channel("amber-alerts-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: "type=eq.amber" },
        () => fetchAmberAlerts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "amber_alerts" },
        () => fetchAmberAlerts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Render markers
  useEffect(() => {
    if (!map) return;

    const currentMarkers = markersRef.current;

    // Remove stale markers
    currentMarkers.forEach((marker, id) => {
      if (!amberAlerts.find((a) => a.id === id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    // Add/update amber markers
    amberAlerts.forEach((alert) => {
      let marker = currentMarkers.get(alert.id);

      if (!marker) {
        const el = document.createElement("div");
        el.className = "amber-alert-marker";
        el.style.cursor = "pointer";

        el.innerHTML = `
          <div class="relative flex flex-col items-center">
            <div class="relative w-8 h-8 rounded-full bg-amber-500 border-2 border-amber-300 shadow-md flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            <div class="mt-0.5 px-1.5 py-px rounded-full bg-amber-500/90 shadow-sm">
              <span class="text-[8px] font-semibold text-white uppercase tracking-wider">MISSING</span>
            </div>
          </div>
        `;

        const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: true });
        const name = alert.missing_name || "Unknown Person";
        const lastSeen = alert.last_seen_place || "Unknown location";
        const lastSeenTime = alert.last_seen_time || timeAgo;
        const age = alert.missing_age ? `, Age ${alert.missing_age}` : "";
        const photoHtml = alert.photo_url
          ? `<img src="${alert.photo_url}" style="width:100%;height:60px;object-fit:cover;border-radius:6px;margin-bottom:6px" />`
          : "";

        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          maxWidth: "240px",
          className: "amber-popup",
        }).setHTML(`
          <div style="padding:10px;font-family:system-ui;background:#fffbeb;border-radius:10px;border:1px solid #f59e0b">
            ${photoHtml}
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <span style="background:#f59e0b;color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;text-transform:uppercase">Amber Alert</span>
            </div>
            <p style="font-weight:600;font-size:13px;color:#92400e;margin:0 0 4px">${name}${age}</p>
            <p style="font-size:11px;color:#78350f;margin:0 0 2px;opacity:0.8">📍 Last seen: ${lastSeen}</p>
            <p style="font-size:10px;color:#78350f;margin:0;opacity:0.6">🕐 ${lastSeenTime}</p>
            ${alert.description ? `<p style="font-size:10px;color:#78350f;margin:6px 0 0;opacity:0.7;line-height:1.3">${alert.description}</p>` : ""}
          </div>
        `);

        marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([alert.longitude, alert.latitude])
          .setPopup(popup)
          .addTo(map);

        currentMarkers.set(alert.id, marker);
      } else {
        marker.setLngLat([alert.longitude, alert.latitude]);
      }
    });

    return () => {
      currentMarkers.forEach((marker) => marker.remove());
      currentMarkers.clear();
    };
  }, [map, amberAlerts]);

  return null;
}

export default AmberAlertMapLayer;

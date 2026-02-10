/**
 * Amber Alert Map Layer
 * Shows ONLY active missing person alerts as amber map markers with photo avatars
 * Creator can resolve their own alert via the popup
 */

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { ResolutionConfirmDialog } from "@/components/ResolutionConfirmDialog";
import { toast } from "sonner";

interface AmberMapAlert {
  id: string;
  latitude: number;
  longitude: number;
  description: string | null;
  created_at: string;
  user_id: string;
  missing_name?: string;
  last_seen_place?: string;
  last_seen_time?: string;
  photo_url?: string;
  missing_age?: number;
}

interface AmberAlertMapLayerProps {
  map: mapboxgl.Map | null;
}

function getInitial(name?: string): string {
  return (name || "?")[0].toUpperCase();
}

export function AmberAlertMapLayer({ map }: AmberAlertMapLayerProps) {
  const { user } = useAuth();
  const [amberAlerts, setAmberAlerts] = useState<AmberMapAlert[]>([]);
  const [resolveTarget, setResolveTarget] = useState<AmberMapAlert | null>(null);
  const [resolving, setResolving] = useState(false);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const fetchAmberAlerts = useCallback(async () => {
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

    const userIds = [...new Set(alerts.map((a) => a.user_id))];
    const { data: amberDetails } = await supabase
      .from("amber_alerts")
      .select("created_by, missing_name, last_seen_place, last_seen_time, photo_url, missing_age")
      .in("created_by", userIds)
      .eq("status", "active");

    const detailMap = new Map(amberDetails?.map((d) => [d.created_by, d]) || []);

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
  }, []);

  useEffect(() => {
    fetchAmberAlerts();

    const channel = supabase
      .channel("amber-alerts-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: "type=eq.amber" }, () => fetchAmberAlerts())
      .on("postgres_changes", { event: "*", schema: "public", table: "amber_alerts" }, () => fetchAmberAlerts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAmberAlerts]);

  const handleResolve = async () => {
    if (!resolveTarget || !user) return;
    setResolving(true);
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", resolveTarget.id)
        .eq("user_id", user.id);

      if (error) throw error;

      // Also update amber_alerts table (uses "closed" enum)
      await supabase
        .from("amber_alerts")
        .update({ status: "closed" })
        .eq("created_by", user.id);

      toast.success("Amber alert marked as resolved.");
      setResolveTarget(null);
      fetchAmberAlerts();
    } catch {
      toast.error("Failed to resolve amber alert");
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    if (!map) return;

    const currentMarkers = markersRef.current;

    currentMarkers.forEach((marker, id) => {
      if (!amberAlerts.find((a) => a.id === id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    amberAlerts.forEach((alert) => {
      let marker = currentMarkers.get(alert.id);

      if (!marker) {
        const el = document.createElement("div");
        el.className = "amber-alert-marker";
        el.style.cursor = "pointer";

        const name = alert.missing_name || "Unknown";

        const avatarContent = alert.photo_url
          ? `<img src="${alert.photo_url}" class="w-full h-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
             <div class="w-full h-full bg-amber-600 items-center justify-center text-white text-sm font-bold" style="display:none">${getInitial(name)}</div>`
          : `<div class="w-full h-full bg-amber-600 flex items-center justify-center text-white text-sm font-bold">${getInitial(name)}</div>`;

        el.innerHTML = `
          <div class="relative flex flex-col items-center">
            <div class="relative w-10 h-10 rounded-full border-[3px] border-amber-400 shadow-lg overflow-hidden bg-neutral-900">
              ${avatarContent}
            </div>
            <div class="mt-0.5 px-1.5 py-px rounded-full bg-amber-500/90 shadow-sm">
              <span class="text-[8px] font-semibold text-white uppercase tracking-wider">MISSING</span>
            </div>
          </div>
        `;

        const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: true });
        const lastSeen = alert.last_seen_place || "Unknown location";
        const lastSeenTime = alert.last_seen_time || timeAgo;
        const age = alert.missing_age ? `, Age ${alert.missing_age}` : "";
        const isOwner = user?.id === alert.user_id;

        const popupContent = document.createElement("div");
        popupContent.innerHTML = `
          <div style="
            background:#141414;border-radius:12px;padding:12px 14px;min-width:200px;
            box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.06);
          ">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
              <span style="background:#f59e0b;color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;text-transform:uppercase">Amber Alert</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              ${alert.photo_url ? `<img src="${alert.photo_url}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid #f59e0b" />` : `<div style="width:28px;height:28px;border-radius:50%;background:#d97706;display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:600">${getInitial(name)}</div>`}
              <div>
                <p style="font-size:13px;color:#e5e5e5;font-weight:600;margin:0">${name}${age}</p>
              </div>
            </div>
            <p style="font-size:11px;color:#a3a3a3;margin:0 0 2px">📍 Last seen: ${lastSeen}</p>
            <p style="font-size:10px;color:#737373;margin:0">🕐 ${lastSeenTime}</p>
            ${alert.description ? `<p style="font-size:10px;color:#737373;margin:6px 0 0;line-height:1.3">${alert.description}</p>` : ""}
            ${isOwner ? `
              <div style="margin-top:10px">
                <button class="amber-resolve-btn" style="
                  width:100%;padding:6px 0;border-radius:8px;background:rgba(245,158,11,0.12);
                  border:1px solid rgba(245,158,11,0.2);color:#fbbf24;font-size:11px;
                  font-weight:500;cursor:pointer;transition:background 0.15s;
                ">Mark as resolved</button>
              </div>
            ` : ""}
          </div>
        `;

        if (isOwner) {
          const resolveBtn = popupContent.querySelector(".amber-resolve-btn");
          if (resolveBtn) resolveBtn.addEventListener("click", () => setResolveTarget(alert));
        }

        const popup = new mapboxgl.Popup({
          offset: 25, closeButton: false, className: "amber-popup", maxWidth: "240px",
        }).setDOMContent(popupContent);

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
      currentMarkers.forEach((m) => m.remove());
      currentMarkers.clear();
    };
  }, [map, amberAlerts, user?.id]);

  return (
    <ResolutionConfirmDialog
      open={!!resolveTarget}
      variant="amber"
      onConfirm={handleResolve}
      onCancel={() => setResolveTarget(null)}
      loading={resolving}
    />
  );
}

export default AmberAlertMapLayer;

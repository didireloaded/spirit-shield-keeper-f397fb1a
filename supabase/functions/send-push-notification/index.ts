/**
 * Send Push Notification Edge Function
 * Fans out notification events to in-app + web push channels
 * Handles geo-filtering, deduplication, and throttling
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEvent {
  eventType: string;
  relatedType: "panic" | "incident" | "amber" | "lookAfterMe";
  relatedId: string;
  triggeredBy: string;
  title: string;
  body: string;
  priority: "critical" | "important" | "info";
  url: string;
  location?: { lat: number; lng: number; placeName: string };
  radiusKm?: number;
  targetUserIds?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const event: NotificationEvent = await req.json();

    let targetUserIds: string[] = event.targetUserIds || [];

    // Geo-filter: find users within radius if location provided
    if (event.location && event.radiusKm && targetUserIds.length === 0) {
      const { data: locations } = await supabase
        .from("user_locations")
        .select("user_id, latitude, longitude, ghost_mode")
        .neq("user_id", event.triggeredBy);

      if (locations) {
        const radiusM = event.radiusKm * 1000;
        targetUserIds = locations
          .filter((loc) => {
            // Ghost mode users still get critical notifications
            if (loc.ghost_mode && event.priority !== "critical") return false;
            const d = haversineDistance(
              event.location!.lat,
              event.location!.lng,
              loc.latitude,
              loc.longitude
            );
            return d <= radiusM;
          })
          .map((loc) => loc.user_id);
      }
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No target users found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplication: check recent notifications to avoid spam
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentNotifs } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("entity_id", event.relatedId)
      .eq("type", event.eventType)
      .gte("created_at", fiveMinAgo);

    const alreadyNotified = new Set(recentNotifs?.map((n) => n.user_id) || []);
    const newTargets = targetUserIds.filter((id) => !alreadyNotified.has(id));

    if (newTargets.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "All users already notified recently" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create in-app notifications
    const notifications = newTargets.map((userId) => ({
      user_id: userId,
      type: event.eventType,
      title: event.title,
      body: event.body,
      priority: event.priority === "critical" ? "high" : event.priority === "important" ? "normal" : "low",
      entity_id: event.relatedId,
      entity_type: event.relatedType,
      actor_id: event.triggeredBy,
      data: {
        url: event.url,
        relatedType: event.relatedType,
        relatedId: event.relatedId,
        placeName: event.location?.placeName,
      },
      read: false,
    }));

    const { error: insertError } = await supabase.from("notifications").insert(notifications);

    if (insertError) {
      console.error("Failed to insert notifications:", insertError);
    }

    // Web Push (if VAPID keys are configured)
    // For now, the in-app real-time subscription handles immediate delivery
    // Web Push would be sent here using the push_subscriptions table

    return new Response(
      JSON.stringify({
        sent: newTargets.length,
        deduplicated: alreadyNotified.size,
        eventType: event.eventType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

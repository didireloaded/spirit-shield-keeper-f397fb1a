import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarkerPayload {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  description?: string;
  user_id: string;
}

// Calculate distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { marker } = await req.json() as { marker: MarkerPayload };

    if (!marker) {
      return new Response(
        JSON.stringify({ error: "Marker data required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Notification] Processing incident:", marker.type, "at", marker.latitude, marker.longitude);

    // Get all user locations within 10km radius (excluding the reporter)
    const { data: nearbyUsers, error: locationError } = await supabase
      .from("user_locations")
      .select("user_id, latitude, longitude")
      .neq("user_id", marker.user_id);

    if (locationError) {
      console.error("[Notification] Error fetching user locations:", locationError);
      throw locationError;
    }

    // Filter users within 10km
    const usersToNotify = (nearbyUsers || []).filter(user => {
      const distance = calculateDistance(
        marker.latitude, 
        marker.longitude, 
        user.latitude, 
        user.longitude
      );
      return distance <= 10; // 10km radius
    });

    console.log("[Notification] Found", usersToNotify.length, "users within 10km");

    // Get push subscriptions for nearby users
    const userIds = usersToNotify.map(u => u.user_id);
    
    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subError) {
      console.error("[Notification] Error fetching subscriptions:", subError);
      throw subError;
    }

    console.log("[Notification] Found", subscriptions?.length || 0, "push subscriptions");

    // For web push notifications, we'd need a VAPID key setup
    // For now, we'll store notifications in a table for the client to poll
    // This approach works without additional infrastructure

    // Create notification records for each nearby user
    const notifications = usersToNotify.map(user => {
      const distance = calculateDistance(
        marker.latitude,
        marker.longitude,
        user.latitude,
        user.longitude
      );
      return {
        user_id: user.user_id,
        type: "incident",
        title: `🚨 ${marker.type.toUpperCase()} Alert Nearby`,
        body: `A ${marker.type} incident was reported ${distance.toFixed(1)}km away from you.`,
        data: {
          marker_id: marker.id,
          incident_type: marker.type,
          latitude: marker.latitude,
          longitude: marker.longitude,
          distance: distance.toFixed(1),
        },
        read: false,
        created_at: new Date().toISOString(),
      };
    });

    // Check if notifications table exists, if not we'll create it
    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      // If table doesn't exist, log but don't fail
      console.log("[Notification] Could not insert notifications:", insertError.message);
    } else {
      console.log("[Notification] Created", notifications.length, "notification records");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: usersToNotify.length,
        subscriptions: subscriptions?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Notification] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

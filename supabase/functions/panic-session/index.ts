import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StartPanicRequest {
  action: "start";
  initialLat: number;
  initialLng: number;
  deviceInfo?: Record<string, unknown>;
}

interface UpdateLocationRequest {
  action: "update_location";
  panicSessionId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

interface EndPanicRequest {
  action: "end";
  panicSessionId: string;
  status?: "ended" | "interrupted";
}

type PanicRequest = StartPanicRequest | UpdateLocationRequest | EndPanicRequest;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PanicRequest = await req.json();
    console.log(`[Panic Session] Action: ${body.action} for user: ${user.id}`);

    // Handle different actions
    if (body.action === "start") {
      return await handleStartPanic(supabase, user.id, body);
    } else if (body.action === "update_location") {
      return await handleUpdateLocation(supabase, user.id, body);
    } else if (body.action === "end") {
      return await handleEndPanic(supabase, user.id, body);
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Panic Session] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleStartPanic(
  supabase: any,
  userId: string,
  body: StartPanicRequest
) {
  const { initialLat, initialLng, deviceInfo } = body;

  // Create panic session
  const { data: session, error: sessionError } = await supabase
    .from("panic_sessions")
    .insert({
      user_id: userId,
      initial_lat: initialLat,
      initial_lng: initialLng,
      last_known_lat: initialLat,
      last_known_lng: initialLng,
      device_info: deviceInfo || {},
      consent_given: true,
    })
    .select()
    .single();

  if (sessionError) {
    console.error("[Panic Session] Failed to create session:", sessionError);
    return new Response(
      JSON.stringify({ error: "Failed to create panic session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[Panic Session] Created session: ${session.id}`);

  // Insert initial location log
  await supabase.from("panic_location_logs").insert({
    panic_session_id: session.id,
    lat: initialLat,
    lng: initialLng,
  });

  // Get user profile for notifications
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", userId)
    .single();

  // Get watchers to notify
  const { data: watchers } = await supabase
    .from("watchers")
    .select("watcher_id")
    .eq("user_id", userId)
    .eq("status", "accepted");

  // Get push subscriptions for watchers
  if (watchers && watchers.length > 0) {
    const watcherIds = watchers.map((w: { watcher_id: string }) => w.watcher_id);
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", watcherIds);

    // Send push notifications to watchers
    if (subscriptions) {
      for (const sub of subscriptions) {
        try {
          // Log the alert
          await supabase.from("panic_alerts").insert({
            panic_session_id: session.id,
            alert_type: "watcher",
            recipient_id: sub.user_id,
            delivery_status: "sent",
          });

          console.log(`[Panic Session] Alert sent to watcher: ${sub.user_id}`);
        } catch (err: unknown) {
          const errMessage = err instanceof Error ? err.message : "Unknown error";
          console.error(`[Panic Session] Failed to alert watcher:`, errMessage);
          await supabase.from("panic_alerts").insert({
            panic_session_id: session.id,
            alert_type: "watcher",
            recipient_id: sub.user_id,
            delivery_status: "failed",
            error_message: errMessage,
          });
        }
      }
    }
  }

  // Create in-app notification for watchers
  if (watchers && watchers.length > 0) {
    const notifications = watchers.map((w: { watcher_id: string }) => ({
      user_id: w.watcher_id,
      type: "panic_alert",
      title: "🚨 PANIC ALERT",
      body: `${profile?.full_name || "Someone you watch"} has triggered a panic alert!`,
      data: {
        panicSessionId: session.id,
        lat: initialLat,
        lng: initialLng,
      },
    }));

    await supabase.from("notifications").insert(notifications);
  }

  return new Response(
    JSON.stringify({
      success: true,
      panicSessionId: session.id,
      startedAt: session.started_at,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleUpdateLocation(
  supabase: any,
  userId: string,
  body: UpdateLocationRequest
) {
  const { panicSessionId, lat, lng, accuracy, speed, heading } = body;

  // Verify session belongs to user and is active
  const { data: session, error: sessionError } = await supabase
    .from("panic_sessions")
    .select("id, status")
    .eq("id", panicSessionId)
    .eq("user_id", userId)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ error: "Session not found or unauthorized" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (session.status !== "active") {
    return new Response(
      JSON.stringify({ error: "Session is not active" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Insert location log
  const { error: logError } = await supabase.from("panic_location_logs").insert({
    panic_session_id: panicSessionId,
    lat,
    lng,
    accuracy,
    speed,
    heading,
  });

  if (logError) {
    console.error("[Panic Session] Failed to log location:", logError);
  }

  // Update session's last known location
  const { error: updateError } = await supabase
    .from("panic_sessions")
    .update({
      last_known_lat: lat,
      last_known_lng: lng,
      last_location_at: new Date().toISOString(),
    })
    .eq("id", panicSessionId);

  if (updateError) {
    console.error("[Panic Session] Failed to update session:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to update location" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleEndPanic(
  supabase: any,
  userId: string,
  body: EndPanicRequest
) {
  const { panicSessionId, status = "ended" } = body;

  // Verify session belongs to user
  const { data: session, error: sessionError } = await supabase
    .from("panic_sessions")
    .select("id")
    .eq("id", panicSessionId)
    .eq("user_id", userId)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ error: "Session not found or unauthorized" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update session status
  const { error: updateError } = await supabase
    .from("panic_sessions")
    .update({
      status,
      ended_at: new Date().toISOString(),
    })
    .eq("id", panicSessionId);

  if (updateError) {
    console.error("[Panic Session] Failed to end session:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to end session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(`[Panic Session] Session ${panicSessionId} ended with status: ${status}`);

  return new Response(
    JSON.stringify({ success: true, status }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

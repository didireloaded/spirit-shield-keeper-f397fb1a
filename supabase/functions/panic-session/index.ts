import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

  // Send SMS and Email alerts to watchers
  await sendEmergencyAlerts(
    supabase,
    session.id,
    userId,
    profile?.full_name || "A user",
    initialLat,
    initialLng,
    watchers || []
  );

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

// Send SMS and Email emergency alerts
async function sendEmergencyAlerts(
  supabase: any,
  panicSessionId: string,
  userId: string,
  userName: string,
  lat: number,
  lng: number,
  watchers: { watcher_id: string }[]
) {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (!watchers || watchers.length === 0) {
    console.log("[Panic Session] No watchers to alert");
    return;
  }

  // Get watcher profiles with contact info
  const watcherIds = watchers.map((w) => w.watcher_id);
  const { data: watcherProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", watcherIds);

  // Get watcher emails from auth.users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const watcherEmails = authUsers?.users?.filter((u: any) => 
    watcherIds.includes(u.id)
  ).map((u: any) => ({ id: u.id, email: u.email })) || [];

  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
  const alertMessage = `🚨 PANIC ALERT: ${userName} needs help! Location: ${mapsLink}`;

  // Send SMS to watchers with phone numbers
  if (twilioSid && twilioAuth && twilioPhone && watcherProfiles) {
    for (const watcher of watcherProfiles) {
      if (watcher.phone) {
        try {
          const formattedPhone = watcher.phone.startsWith("+") 
            ? watcher.phone 
            : `+${watcher.phone}`;
          
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const credentials = btoa(`${twilioSid}:${twilioAuth}`);

          const response = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${credentials}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: formattedPhone,
              From: twilioPhone,
              Body: alertMessage,
            }),
          });

          const result = await response.json();
          const status = response.ok ? "sent" : "failed";

          await supabase.from("panic_alerts").insert({
            panic_session_id: panicSessionId,
            alert_type: "sms",
            recipient_id: watcher.id,
            recipient_info: formattedPhone,
            delivery_status: status,
            error_message: response.ok ? null : result.message,
          });

          console.log(`[Panic Session] SMS ${status} to ${watcher.id}`);
        } catch (err: unknown) {
          const errMessage = err instanceof Error ? err.message : "Unknown error";
          console.error(`[Panic Session] SMS failed to ${watcher.id}:`, errMessage);
          
          await supabase.from("panic_alerts").insert({
            panic_session_id: panicSessionId,
            alert_type: "sms",
            recipient_id: watcher.id,
            recipient_info: watcher.phone,
            delivery_status: "failed",
            error_message: errMessage,
          });
        }
      }
    }
  }

  // Send Email to watchers
  if (resendKey && watcherEmails.length > 0) {
    const resend = new Resend(resendKey);

    for (const watcher of watcherEmails) {
      if (watcher.email) {
        try {
          const watcherProfile = watcherProfiles?.find((p: any) => p.id === watcher.id);
          const watcherName = watcherProfile?.full_name || "there";

          const emailResponse = await resend.emails.send({
            from: "Spirit Shield <alerts@resend.dev>",
            to: [watcher.email],
            subject: "🚨 EMERGENCY: Panic Alert Triggered",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #18181b; color: #fafafa;">
                <div style="background-color: #ef4444; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">🚨 PANIC ALERT</h1>
                </div>
                <div style="padding: 20px; background-color: #27272a; border-radius: 8px;">
                  <p style="font-size: 18px; margin-bottom: 16px;">Hi ${watcherName},</p>
                  <p style="font-size: 16px; margin-bottom: 16px;"><strong>${userName}</strong> has triggered a panic alert and needs immediate assistance.</p>
                  <div style="background-color: #3f3f46; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #a1a1aa;">Last Known Location:</p>
                    <p style="margin: 0; font-size: 14px;">Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</p>
                  </div>
                  <a href="${mapsLink}" 
                     style="display: inline-block; background-color: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-top: 16px;">
                    View Location on Map
                  </a>
                  <p style="font-size: 14px; color: #a1a1aa; margin-top: 24px;">This is an automated emergency alert from Spirit Shield.</p>
                </div>
              </div>
            `,
          });

          await supabase.from("panic_alerts").insert({
            panic_session_id: panicSessionId,
            alert_type: "email",
            recipient_id: watcher.id,
            recipient_info: watcher.email,
            delivery_status: "sent",
          });

          console.log(`[Panic Session] Email sent to ${watcher.id}:`, emailResponse);
        } catch (err: unknown) {
          const errMessage = err instanceof Error ? err.message : "Unknown error";
          console.error(`[Panic Session] Email failed to ${watcher.id}:`, errMessage);
          
          await supabase.from("panic_alerts").insert({
            panic_session_id: panicSessionId,
            alert_type: "email",
            recipient_id: watcher.id,
            recipient_info: watcher.email,
            delivery_status: "failed",
            error_message: errMessage,
          });
        }
      }
    }
  }
}

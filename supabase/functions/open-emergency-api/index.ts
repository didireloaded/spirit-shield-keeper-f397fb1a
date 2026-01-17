import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface CreateSOSRequest {
  externalId: string;
  lat: number;
  lng: number;
  trigger: "manual" | "crash" | "ai" | "api";
  metadata?: Record<string, unknown>;
  userId?: string;
}

interface UpdateLocationRequest {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

interface ResolveSOSRequest {
  reason: string;
}

// Rate limiting (simple in-memory, per-function instance)
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(apiKey: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(apiKey);
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(apiKey, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (limit.count >= RATE_LIMIT) {
    return false;
  }
  
  limit.count++;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // API Key authentication
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key (check against stored keys)
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("id, partner_name, permissions, is_active")
      .eq("key_hash", await hashApiKey(apiKey))
      .single();

    if (keyError || !keyData || !keyData.is_active) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive API key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit
    if (!checkRateLimit(apiKey)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Max 60 requests per minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Route: POST /api/v1/sos - Create SOS
    if (req.method === "POST" && pathParts.length === 3 && pathParts[2] === "sos") {
      const body: CreateSOSRequest = await req.json();
      return await createSOS(supabase, keyData.id, body);
    }
    
    // Route: POST /api/v1/sos/:id/location - Update location
    if (req.method === "POST" && pathParts.length === 5 && pathParts[4] === "location") {
      const sosId = pathParts[3];
      const body: UpdateLocationRequest = await req.json();
      return await updateLocation(supabase, sosId, keyData.id, body);
    }
    
    // Route: POST /api/v1/sos/:id/resolve - Resolve SOS
    if (req.method === "POST" && pathParts.length === 5 && pathParts[4] === "resolve") {
      const sosId = pathParts[3];
      const body: ResolveSOSRequest = await req.json();
      return await resolveSOS(supabase, sosId, keyData.id, body);
    }
    
    // Route: GET /api/v1/sos/:id - Get SOS status
    if (req.method === "GET" && pathParts.length === 4) {
      const sosId = pathParts[3];
      return await getSOSStatus(supabase, sosId, keyData.id);
    }

    return new Response(
      JSON.stringify({ error: "Not found", path: url.pathname }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[OpenEmergencyAPI] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Hash API key for storage comparison
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Create new SOS incident
async function createSOS(
  supabase: any,
  apiKeyId: string,
  body: CreateSOSRequest
) {
  const { externalId, lat, lng, trigger, metadata, userId } = body;

  // Validate coordinates
  if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return new Response(
      JSON.stringify({ error: "Invalid coordinates" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create panic session
  const { data: session, error: sessionError } = await supabase
    .from("panic_sessions")
    .insert({
      user_id: userId || null,
      initial_lat: lat,
      initial_lng: lng,
      last_known_lat: lat,
      last_known_lng: lng,
      device_info: {
        externalId,
        trigger,
        apiKeyId,
        ...metadata,
      },
      consent_given: true,
      status: "active",
    })
    .select()
    .single();

  if (sessionError) {
    console.error("[OpenEmergencyAPI] Failed to create SOS:", sessionError);
    return new Response(
      JSON.stringify({ error: "Failed to create SOS" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Log initial location
  await supabase.from("panic_location_logs").insert({
    panic_session_id: session.id,
    lat,
    lng,
  });

  // Log API usage
  await supabase.from("api_usage_logs").insert({
    api_key_id: apiKeyId,
    action: "create_sos",
    resource_id: session.id,
    metadata: { externalId, trigger },
  });

  console.log(`[OpenEmergencyAPI] SOS created: ${session.id} by API key: ${apiKeyId}`);

  return new Response(
    JSON.stringify({
      success: true,
      sosId: session.id,
      status: "active",
      createdAt: session.created_at,
    }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Update SOS location
async function updateLocation(
  supabase: any,
  sosId: string,
  apiKeyId: string,
  body: UpdateLocationRequest
) {
  const { lat, lng, accuracy, speed, heading } = body;

  // Verify session exists
  const { data: session, error: sessionError } = await supabase
    .from("panic_sessions")
    .select("id, status")
    .eq("id", sosId)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ error: "SOS not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (session.status !== "active") {
    return new Response(
      JSON.stringify({ error: "SOS is not active" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Insert location log
  await supabase.from("panic_location_logs").insert({
    panic_session_id: sosId,
    lat,
    lng,
    accuracy,
    speed,
    heading,
  });

  // Update session
  await supabase
    .from("panic_sessions")
    .update({
      last_known_lat: lat,
      last_known_lng: lng,
      last_location_at: new Date().toISOString(),
    })
    .eq("id", sosId);

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Resolve SOS
async function resolveSOS(
  supabase: any,
  sosId: string,
  apiKeyId: string,
  body: ResolveSOSRequest
) {
  const { reason } = body;

  // Verify session exists
  const { data: session, error: sessionError } = await supabase
    .from("panic_sessions")
    .select("id")
    .eq("id", sosId)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ error: "SOS not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update session
  await supabase
    .from("panic_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      device_info: supabase.sql`device_info || ${JSON.stringify({ resolveReason: reason, resolvedByApi: apiKeyId })}::jsonb`,
    })
    .eq("id", sosId);

  // Log API usage
  await supabase.from("api_usage_logs").insert({
    api_key_id: apiKeyId,
    action: "resolve_sos",
    resource_id: sosId,
    metadata: { reason },
  });

  return new Response(
    JSON.stringify({ success: true, status: "ended" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Get SOS status
async function getSOSStatus(
  supabase: any,
  sosId: string,
  apiKeyId: string
) {
  const { data: session, error: sessionError } = await supabase
    .from("panic_sessions")
    .select("id, status, started_at, ended_at, last_known_lat, last_known_lng, last_location_at")
    .eq("id", sosId)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ error: "SOS not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      sosId: session.id,
      status: session.status,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      lastLocation: {
        lat: session.last_known_lat,
        lng: session.last_known_lng,
        updatedAt: session.last_location_at,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

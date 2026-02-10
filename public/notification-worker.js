/**
 * Safety-Aware Notification Service Worker
 * 
 * Handles Web Push for: Panic, Incident, Amber, LookAfterMe
 * Each type routes to exact context on click.
 * 
 * RULES:
 * - tag-based deduplication per relatedType+relatedId
 * - Panic movement updates are SILENT (no push, map-only)
 * - Critical alerts use requireInteraction
 * - Click always opens exact context (map + coordinates, or community thread)
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * PUSH EVENT
 * Payload must contain: { title, body, relatedType, relatedId, priority, url, tag? }
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    return; // Malformed payload, ignore
  }

  // RULE: Panic movement updates are NEVER pushed — they update map only
  if (data.eventType === "panic_movement") return;

  const relatedType = data.relatedType || "unknown";
  const relatedId = data.relatedId || "";
  const priority = data.priority || "info";

  // Build tag for deduplication: same type+id = replace, not stack
  const tag = data.tag || `${relatedType}_${relatedId}`;

  const options = {
    body: data.body || "Safety update",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: tag,
    renotify: priority === "critical", // Only re-alert for critical
    requireInteraction: priority === "critical",
    silent: priority === "info",
    data: {
      url: data.url || "/",
      relatedType: relatedType,
      relatedId: relatedId,
      priority: priority,
      lat: data.lat,
      lng: data.lng,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Safety update", options)
  );
});

/**
 * NOTIFICATION CLICK
 * Routes to exact context based on relatedType:
 * - panic    → /map?panic={id}&lat={lat}&lng={lng}&zoom=16
 * - incident → /map?incident={id}&lat={lat}&lng={lng}&zoom=15
 * - amber    → /amber-chat/{id}
 * - lookAfterMe → /look-after-me
 * - default  → /alerts
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const nd = event.notification.data || {};
  const targetUrl = buildTargetUrl(nd);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to reuse an existing app window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            // Send structured context message so the app can navigate internally
            client.postMessage({
              type: "NOTIFICATION_TAP",
              relatedType: nd.relatedType,
              relatedId: nd.relatedId,
              lat: nd.lat,
              lng: nd.lng,
              url: targetUrl,
            });
            return client.focus();
          }
        }
        // No open window — open fresh
        return self.clients.openWindow(targetUrl);
      })
  );
});

/**
 * Build the exact deep-link URL for each alert type
 */
function buildTargetUrl(nd) {
  const relatedType = nd.relatedType || "";
  const relatedId = nd.relatedId || "";

  switch (relatedType) {
    case "panic": {
      let url = `/map?panic=${relatedId}`;
      if (nd.lat && nd.lng) url += `&lat=${nd.lat}&lng=${nd.lng}&zoom=16`;
      return url;
    }
    case "incident": {
      let url = `/map?incident=${relatedId}`;
      if (nd.lat && nd.lng) url += `&lat=${nd.lat}&lng=${nd.lng}&zoom=15`;
      return url;
    }
    case "amber":
      return `/amber-chat/${relatedId}`;
    case "lookAfterMe":
      return "/look-after-me";
    default:
      return nd.url || "/alerts";
  }
}

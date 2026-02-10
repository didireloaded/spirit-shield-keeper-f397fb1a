/**
 * Notification Service Worker
 * Handles Web Push notifications and click-to-navigate
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Safety update", body: event.data.text() };
  }

  const title = data.title || "Safety update";

  const options = {
    body: data.body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: data.tag || data.eventId || "default",
    renotify: false,
    requireInteraction: data.priority === "critical",
    silent: data.priority === "info",
    data: {
      url: data.url || "/",
      relatedType: data.relatedType,
      relatedId: data.relatedId,
      priority: data.priority,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click - navigate to exact context
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.postMessage({
              type: "OPEN_CONTEXT",
              relatedType: event.notification.data?.relatedType,
              relatedId: event.notification.data?.relatedId,
            });
            return client.focus();
          }
        }
        // No existing window, open new one
        return self.clients.openWindow(targetUrl);
      })
  );
});

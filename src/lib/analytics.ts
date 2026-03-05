/**
 * Analytics Event Tracking
 * Lightweight analytics layer. In production, wire to Mixpanel / GA / PostHog.
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
}

function trackEvent(event: AnalyticsEvent) {
  if (import.meta.env.DEV) {
    console.log("📊 Analytics:", event.name, event.properties ?? "");
  }
  // In production, send to analytics service
}

export const Analytics = {
  // Auth
  signUp: () => trackEvent({ name: "user_signup" }),
  signIn: () => trackEvent({ name: "user_signin" }),

  // Incidents
  createIncident: (type: string) =>
    trackEvent({ name: "incident_created", properties: { type } }),
  verifyIncident: () => trackEvent({ name: "incident_verified" }),

  // Emergency
  panicButton: () => trackEvent({ name: "panic_button_pressed" }),
  amberAlert: () => trackEvent({ name: "amber_alert_created" }),

  // Community
  createPost: () => trackEvent({ name: "community_post_created" }),
  addWatcher: () => trackEvent({ name: "watcher_added" }),

  // Navigation
  viewPage: (page: string) =>
    trackEvent({ name: "page_view", properties: { page } }),
};

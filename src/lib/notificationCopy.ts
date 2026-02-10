/**
 * Notification Copy Language
 * Calm. Trustworthy. Never dramatic. Never fear-based.
 * No emojis. No exclamation marks. No all caps.
 */

export interface NotificationCopy {
  title: string;
  body: string;
  url: string;
  priority: "critical" | "important" | "info";
  relatedType: "panic" | "incident" | "amber" | "lookAfterMe" | "comment";
}

export function getPanicStartedCopy(placeName: string, relatedId: string): NotificationCopy {
  return {
    title: "Panic alert nearby",
    body: `Last seen near ${placeName || "your area"}. Tap to view on map`,
    url: `/map?panic=${relatedId}`,
    priority: "critical",
    relatedType: "panic",
  };
}

export function getPanicEndedCopy(relatedId: string): NotificationCopy {
  return {
    title: "Panic alert ended",
    body: "Tracking has stopped. View details if needed",
    url: `/map?panic=${relatedId}`,
    priority: "important",
    relatedType: "panic",
  };
}

export function getIncidentNearCopy(placeName: string, relatedId: string): NotificationCopy {
  return {
    title: "Incident reported nearby",
    body: `Reported near ${placeName || "your area"}. Tap to view details`,
    url: `/map?incident=${relatedId}`,
    priority: "important",
    relatedType: "incident",
  };
}

export function getIncidentStatusCopy(status: string, relatedId: string): NotificationCopy {
  const statusLabel = status === "resolved" ? "resolved" : `updated to "${status}"`;
  return {
    title: status === "resolved" ? "Incident resolved" : "Incident update",
    body: status === "resolved"
      ? "Reported issue has been marked resolved"
      : `Status ${statusLabel}`,
    url: `/map?incident=${relatedId}`,
    priority: status === "resolved" ? "info" : "important",
    relatedType: "incident",
  };
}

export function getAmberAlertCopy(relatedId: string): NotificationCopy {
  return {
    title: "Missing person alert",
    body: "Community assistance requested. Tap to view details",
    url: `/amber-chat/${relatedId}`,
    priority: "important",
    relatedType: "amber",
  };
}

export function getAmberClosedCopy(relatedId: string): NotificationCopy {
  return {
    title: "Amber alert update",
    body: "This alert has been closed",
    url: `/amber-chat/${relatedId}`,
    priority: "info",
    relatedType: "amber",
  };
}

export function getLookAfterMeStartCopy(userName: string): NotificationCopy {
  return {
    title: "Tracking started",
    body: `${userName} has started live location sharing`,
    url: "/look-after-me",
    priority: "info",
    relatedType: "lookAfterMe",
  };
}

export function getLookAfterMeEndCopy(userName: string): NotificationCopy {
  return {
    title: "Tracking ended",
    body: `${userName} has stopped live location sharing`,
    url: "/look-after-me",
    priority: "info",
    relatedType: "lookAfterMe",
  };
}

export function getCommentCopy(relatedId: string): NotificationCopy {
  return {
    title: "New update",
    body: "Someone commented on an alert you follow",
    url: `/community`,
    priority: "info",
    relatedType: "comment",
  };
}

/**
 * Build the push payload from notification copy
 */
export function buildPushPayload(copy: NotificationCopy, relatedId: string) {
  return {
    title: copy.title,
    body: copy.body,
    url: copy.url,
    relatedType: copy.relatedType,
    relatedId,
    priority: copy.priority,
    tag: `${copy.relatedType}_${relatedId}`,
    eventId: `${copy.relatedType}_${relatedId}_${Date.now()}`,
  };
}

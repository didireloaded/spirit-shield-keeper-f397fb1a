import { supabase } from "@/integrations/supabase/client";

type AlertEventType = 
  | "created"
  | "audio_started"
  | "audio_stopped"
  | "location_updated"
  | "status_changed"
  | "resolved"
  | "cancelled"
  | "app_backgrounded"
  | "device_offline";

interface AlertEventMetadata {
  [key: string]: unknown;
}

export const useAlertEvents = () => {
  const logEvent = async (
    alertId: string,
    eventType: AlertEventType,
    metadata: AlertEventMetadata = {}
  ) => {
    try {
      const { error } = await supabase
        .from("alert_events")
        .insert([{
          alert_id: alertId,
          event_type: eventType,
          metadata: metadata as any,
        }]);

      if (error) {
        console.error("Failed to log alert event:", error);
      }
    } catch (err) {
      console.error("Error logging alert event:", err);
    }
  };

  const logCreated = (alertId: string, alertType: string, location: { lat: number; lng: number }) => {
    return logEvent(alertId, "created", { alert_type: alertType, ...location });
  };

  const logAudioStarted = (alertId: string) => {
    return logEvent(alertId, "audio_started", { started_at: new Date().toISOString() });
  };

  const logAudioStopped = (alertId: string, durationSeconds?: number) => {
    return logEvent(alertId, "audio_stopped", { 
      stopped_at: new Date().toISOString(),
      duration_seconds: durationSeconds 
    });
  };

  const logLocationUpdated = (alertId: string, location: { lat: number; lng: number; accuracy?: number }) => {
    return logEvent(alertId, "location_updated", location);
  };

  const logStatusChanged = (alertId: string, oldStatus: string, newStatus: string) => {
    return logEvent(alertId, "status_changed", { old_status: oldStatus, new_status: newStatus });
  };

  const logResolved = (alertId: string, resolvedBy?: string) => {
    return logEvent(alertId, "resolved", { resolved_by: resolvedBy });
  };

  const logCancelled = (alertId: string, reason?: string) => {
    return logEvent(alertId, "cancelled", { reason });
  };

  return {
    logEvent,
    logCreated,
    logAudioStarted,
    logAudioStopped,
    logLocationUpdated,
    logStatusChanged,
    logResolved,
    logCancelled,
  };
};

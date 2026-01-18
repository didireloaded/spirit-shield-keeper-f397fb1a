/**
 * Offline SOS fallback logic
 * When internet is unavailable, uses SMS/call fallback
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface QueuedSOS {
  id: string;
  lat: number;
  lng: number;
  timestamp: number;
  synced: boolean;
}

interface EmergencyContact {
  name: string;
  phone: string;
}

export const useOfflineSOS = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedSOS[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAuth();
  
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync queue when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncQueue();
    }
  }, [isOnline, queue.length]);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem("sos_offline_queue");
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error("[OfflineSOS] Failed to parse queue:", e);
      }
    }
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    localStorage.setItem("sos_offline_queue", JSON.stringify(queue));
  }, [queue]);

  // Get emergency contacts from profile
  const getEmergencyContacts = useCallback(async (): Promise<EmergencyContact[]> => {
    if (!user) return [];

    // Get watchers who are emergency contacts
    const { data: watchers } = await supabase
      .from("watchers")
      .select(`
        watcher_id,
        profiles:watcher_id (full_name, phone)
      `)
      .eq("user_id", user.id)
      .eq("status", "accepted");

    if (!watchers) return [];

    return watchers
      .filter((w: any) => w.profiles?.phone)
      .map((w: any) => ({
        name: w.profiles.full_name || "Emergency Contact",
        phone: w.profiles.phone,
      }));
  }, [user]);

  // Format SMS message
  const formatSMSMessage = useCallback((lat: number, lng: number): string => {
    const mapLink = `https://maps.google.com/?q=${lat},${lng}`;
    return `🚨 EMERGENCY ALERT\n\nI may be in danger and need help.\n\nLast known location:\n${mapLink}\n\nPlease contact emergency services if you cannot reach me.`;
  }, []);

  // Trigger SMS fallback (opens native SMS app)
  const triggerSMSFallback = useCallback(async (lat: number, lng: number) => {
    const contacts = await getEmergencyContacts();
    const message = formatSMSMessage(lat, lng);

    if (contacts.length === 0) {
      console.warn("[OfflineSOS] No emergency contacts with phone numbers");
      return false;
    }

    // Open SMS for first contact
    const primaryContact = contacts[0];
    const smsUrl = `sms:${primaryContact.phone}?body=${encodeURIComponent(message)}`;
    
    window.location.href = smsUrl;
    return true;
  }, [getEmergencyContacts, formatSMSMessage]);

  // Trigger call fallback
  const triggerCallFallback = useCallback(async () => {
    const contacts = await getEmergencyContacts();

    if (contacts.length > 0) {
      // Call first emergency contact
      window.location.href = `tel:${contacts[0].phone}`;
      return true;
    }

    // Fallback to national emergency number
    window.location.href = "tel:10111";
    return true;
  }, [getEmergencyContacts]);

  // Queue offline SOS
  const queueOfflineSOS = useCallback((lat: number, lng: number) => {
    const newSOS: QueuedSOS = {
      id: `offline_${Date.now()}`,
      lat,
      lng,
      timestamp: Date.now(),
      synced: false,
    };

    setQueue((prev) => [...prev, newSOS]);
    console.log("[OfflineSOS] SOS queued for sync:", newSOS);
    
    return newSOS.id;
  }, []);

  // Trigger offline SOS (SMS + Call + Queue)
  const triggerOfflineSOS = useCallback(async (lat: number, lng: number) => {
    console.log("[OfflineSOS] Triggering offline SOS...");

    // Queue for later sync
    queueOfflineSOS(lat, lng);

    // Trigger SMS
    await triggerSMSFallback(lat, lng);

    // After SMS, optionally trigger call
    setTimeout(() => {
      triggerCallFallback();
    }, 2000);

    return true;
  }, [queueOfflineSOS, triggerSMSFallback, triggerCallFallback]);

  // Sync queued SOS when back online
  const syncQueue = useCallback(async () => {
    if (isSyncing || !user) return;
    
    const unsynced = queue.filter((q) => !q.synced);
    if (unsynced.length === 0) return;

    setIsSyncing(true);
    console.log(`[OfflineSOS] Syncing ${unsynced.length} queued SOS...`);

    for (const sos of unsynced) {
      try {
        // Create alert for queued SOS
        await supabase.from("alerts").insert({
          user_id: user.id,
          type: "panic",
          latitude: sos.lat,
          longitude: sos.lng,
          description: `Offline SOS (queued at ${new Date(sos.timestamp).toISOString()})`,
          status: "active",
        });

        // Mark as synced
        setQueue((prev) =>
          prev.map((q) =>
            q.id === sos.id ? { ...q, synced: true } : q
          )
        );

        console.log(`[OfflineSOS] Synced SOS: ${sos.id}`);
      } catch (err) {
        console.error(`[OfflineSOS] Failed to sync SOS ${sos.id}:`, err);
      }
    }

    setIsSyncing(false);

    // Clean up old synced items after 24 hours
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    setQueue((prev) => prev.filter((q) => !q.synced || q.timestamp > dayAgo));
  }, [isSyncing, user, queue]);

  // Clear queue
  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem("sos_offline_queue");
  }, []);

  return {
    isOnline,
    queueLength: queue.filter((q) => !q.synced).length,
    isSyncing,
    triggerOfflineSOS,
    triggerSMSFallback,
    triggerCallFallback,
    syncQueue,
    clearQueue,
    formatSMSMessage,
  };
};

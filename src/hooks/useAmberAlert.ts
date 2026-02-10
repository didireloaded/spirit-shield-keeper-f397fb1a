import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useRateLimit } from "@/hooks/useRateLimit";
import { toast } from "sonner";

interface AmberFormData {
  description: string;
  outfit: string;
  vehicle: string;
  color: string;
  plate: string;
  photo?: File | null;
}

export function useAmberAlert(incident: { id: string; name: string; icon: string; category: string }) {
  const { user } = useAuth();
  const { latitude, longitude } = useGeolocation();
  const { checkAmberLimit } = useRateLimit();
  const [alert, setAlert] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const [chatRoom, setChatRoom] = useState<any>(null);
  const [participants, setParticipants] = useState(0);

  const createAlert = useCallback(async (formData: AmberFormData) => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    if (!latitude || !longitude) {
      toast.error("Unable to get location. Please enable GPS.");
      return;
    }

    const allowed = await checkAmberLimit();
    if (!allowed) return;

    // Upload photo if provided
    let photoUrl: string | null = null;
    if (formData.photo) {
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const { data: uploadData } = await supabase.storage
        .from("post-images")
        .upload(fileName, formData.photo);
      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(uploadData.path);
        photoUrl = urlData.publicUrl;
      }
    }

    // Create panic session with amber type
    const descriptionJson = JSON.stringify({
      ...formData,
      photo: undefined,
      photoUrl,
    });

    const { data: session, error } = await supabase
      .from("panic_sessions")
      .insert({
        user_id: user.id,
        session_type: "amber",
        incident_type: incident.name,
        description: descriptionJson,
        initial_lat: latitude,
        initial_lng: longitude,
        last_known_lat: latitude,
        last_known_lng: longitude,
        severity: "critical",
        status: "active",
        consent_given: true,
      })
      .select()
      .single();

    if (error || !session) {
      toast.error("Failed to create amber alert");
      return;
    }

    // Create community chat room
    const { data: room } = await supabase
      .from("chat_rooms")
      .insert({
        panic_session_id: session.id,
        type: "amber",
        title: `🚨 AMBER ALERT: ${incident.name}`,
        description: formData.description,
        is_active: true,
      })
      .select()
      .single();

    if (room) {
      await supabase
        .from("panic_sessions")
        .update({ chat_room_id: room.id })
        .eq("id", session.id);

      // System message
      await supabase.from("chat_messages").insert({
        chat_room_id: room.id,
        user_id: user.id,
        message: `🚨 AMBER ALERT: ${incident.name}. ${formData.description}. Please report any sightings.`,
        type: "system",
      });

      setChatRoom(room);
    }

    // Also create an alert in the alerts table for legacy compatibility
    await supabase.from("alerts").insert({
      user_id: user.id,
      type: "amber" as const,
      latitude,
      longitude,
      description: formData.description,
      status: "active" as const,
    });

    setAlert(session);
    setIsActive(true);
    toast.success("🚨 Amber alert issued! Community chat created.");
  }, [user, latitude, longitude, incident, checkAmberLimit]);

  const endAlert = useCallback(async () => {
    if (!alert) return;

    await supabase
      .from("panic_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", alert.id);

    if (chatRoom) {
      await supabase
        .from("chat_rooms")
        .update({ is_active: false, closed_at: new Date().toISOString() })
        .eq("id", chatRoom.id);
    }

    setIsActive(false);
    setAlert(null);
    setChatRoom(null);
    toast.success("Amber alert resolved");
  }, [alert, chatRoom]);

  return { alert, isActive, chatRoom, participants, createAlert, endAlert };
}

import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PanicSession {
  id: string;
  status: "active" | "ended" | "interrupted";
  started_at: string;
  initial_lat: number;
  initial_lng: number;
  last_known_lat: number;
  last_known_lng: number;
  trigger_source?: "manual" | "crash" | "ai" | "api";
  threat_score?: number;
  escalated?: boolean;
}

interface AudioChunk {
  index: number;
  blob: Blob;
  startTime: Date;
  endTime: Date;
  uploaded: boolean;
}

// Configuration
const CHUNK_DURATION_MS = 15000; // 15 seconds per chunk
const LOCATION_UPDATE_INTERVAL_MS = 10000; // 10 seconds

export const usePanicSession = () => {
  const [session, setSession] = useState<PanicSession | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  
  // Refs for persistent state during recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkIndexRef = useRef(0);
  const chunkStartTimeRef = useRef<Date | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Get device info
  const getDeviceInfo = useCallback(() => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString(),
    };
  }, []);

  // Upload a single audio chunk
  const uploadAudioChunk = useCallback(async (
    panicSessionId: string,
    blob: Blob,
    chunkIndex: number,
    startTime: Date,
    endTime: Date
  ) => {
    if (!user) return null;

    const fileName = `${user.id}/${panicSessionId}/${chunkIndex}-${startTime.getTime()}.webm`;
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    // Upload chunk

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("audio-evidence")
      .upload(fileName, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (uploadError) {
      console.error(`[Panic] Failed to upload chunk ${chunkIndex}:`, uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("audio-evidence")
      .getPublicUrl(uploadData.path);

    // Insert chunk record
    const { error: insertError } = await supabase
      .from("panic_audio_chunks")
      .insert({
        panic_session_id: panicSessionId,
        file_url: urlData.publicUrl,
        chunk_index: chunkIndex,
        chunk_start_time: startTime.toISOString(),
        chunk_end_time: endTime.toISOString(),
        duration_seconds: durationSeconds,
        file_size_bytes: blob.size,
      });

    if (insertError) {
      console.error(`[Panic] Failed to record chunk metadata:`, insertError);
      return null;
    }

    // Chunk uploaded
    return urlData.publicUrl;
  }, [user]);

  // Process and upload accumulated chunks
  const processChunks = useCallback(async () => {
    if (!sessionIdRef.current || chunksRef.current.length === 0) return;

    const blob = new Blob(chunksRef.current, { 
      type: mediaRecorderRef.current?.mimeType || "audio/webm" 
    });
    
    const startTime = chunkStartTimeRef.current || new Date();
    const endTime = new Date();
    const currentIndex = chunkIndexRef.current;

    // Clear chunks for next batch
    chunksRef.current = [];
    chunkStartTimeRef.current = new Date();
    chunkIndexRef.current++;

    // Upload in background
    await uploadAudioChunk(
      sessionIdRef.current,
      blob,
      currentIndex,
      startTime,
      endTime
    );

    setChunkCount(prev => prev + 1);
  }, [uploadAudioChunk]);

  // Update location
  const updateLocation = useCallback(async (panicSessionId: string) => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        try {
          await supabase.functions.invoke("panic-session", {
            body: {
              action: "update_location",
              panicSessionId,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading,
            },
          });
        } catch {
          // Location update failed - non-critical
        }
      },
      () => {},
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, []);

  // Start panic session
  const startPanic = useCallback(async (
    triggerSource: "manual" | "crash" | "ai" | "api" = "manual",
    threatScore?: number
  ) => {
    if (!user) {
      setError("You must be logged in to trigger a panic alert");
      return null;
    }

    setError(null);

    // Get position fast — accept cached position to avoid blocking
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      // First try a fast cached position
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 3000,
        maximumAge: 60000, // Accept up to 1 minute old
      });
    }).catch(async () => {
      // Fallback: try high accuracy with short timeout
      return new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 120000,
        });
      }).catch(() => null);
    });

    if (!position) {
      setError("Unable to get location. Please enable GPS.");
      return null;
    }

    const { latitude, longitude } = position.coords;
    const deviceInfo = {
      ...getDeviceInfo(),
      triggerSource,
      threatScore: threatScore || 0,
    };

    // Starting panic session

    // Create session via edge function
    const { data, error: sessionError } = await supabase.functions.invoke("panic-session", {
      body: {
        action: "start",
        initialLat: latitude,
        initialLng: longitude,
        deviceInfo,
        triggerSource,
        threatScore,
      },
    });

    if (sessionError || !data?.panicSessionId) {
      setError("Failed to create panic session");
      void sessionError;
      return null;
    }

    const panicSessionId = data.panicSessionId;
    sessionIdRef.current = panicSessionId;

    toast.success("Panic alert activated. Recording audio.");

    // Start audio recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      chunkIndexRef.current = 0;
      chunkStartTimeRef.current = new Date();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Start recording with small timeslice for continuous data
      mediaRecorder.start(1000);
      setIsRecording(true);

      // Audio recording started

      // Set up chunk processing interval
      chunkIntervalRef.current = setInterval(() => {
        processChunks();
      }, CHUNK_DURATION_MS);

      // Set up location updates
      locationIntervalRef.current = setInterval(() => {
        updateLocation(panicSessionId);
      }, LOCATION_UPDATE_INTERVAL_MS);

    } catch (err) {
      console.error("[Panic] Failed to start audio recording:", err);
      setError("Failed to access microphone");
    }

    setSession({
      id: panicSessionId,
      status: "active",
      started_at: data.startedAt,
      initial_lat: latitude,
      initial_lng: longitude,
      last_known_lat: latitude,
      last_known_lng: longitude,
      trigger_source: triggerSource,
      threat_score: threatScore || 0,
      escalated: false,
    });
    setIsActive(true);

    return panicSessionId;
  }, [user, getDeviceInfo, processChunks, updateLocation]);

  // End panic session
  const endPanic = useCallback(async (status: "ended" | "interrupted" = "ended") => {
    if (!sessionIdRef.current) return;

    const panicSessionId = sessionIdRef.current;
    // Ending session

    // Stop intervals
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }

    // Process remaining chunks
    if (mediaRecorderRef.current && chunksRef.current.length > 0) {
      await processChunks();
    }

    // Stop recording
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // End session via edge function
    await supabase.functions.invoke("panic-session", {
      body: {
        action: "end",
        panicSessionId,
        status,
      },
    });

    setIsRecording(false);
    setIsActive(false);
    setSession(null);
    sessionIdRef.current = null;
    setChunkCount(0);

    toast.info(status === "ended" ? "Panic alert ended. Evidence saved." : "Panic alert interrupted.");

    // Session ended
  }, [processChunks]);

  // Cancel panic session
  const cancelPanic = useCallback(async () => {
    await endPanic("interrupted");
    toast.info("Panic alert cancelled.");
  }, [endPanic]);

  // Clean up on unmount — only if session is NOT active
  // This prevents navigation from killing an active recording
  useEffect(() => {
    return () => {
      if (!sessionIdRef.current) {
        // No active session, safe to clean up
        if (chunkIntervalRef.current) {
          clearInterval(chunkIntervalRef.current);
        }
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      }
      // If session IS active, keep recording alive across navigation
    };
  }, []);

  return {
    session,
    isActive,
    isRecording,
    chunkCount,
    error,
    startPanic,
    endPanic,
    cancelPanic,
  };
};

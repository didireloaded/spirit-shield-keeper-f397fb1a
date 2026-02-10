/**
 * Panic Recording Hook
 * Uses Service Worker for background recording that continues when phone is locked
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CHUNK_DURATION_MS = 10000; // 10 seconds

export function usePanicRecording() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<ServiceWorkerRegistration | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentChunkRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Register service worker on mount
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/panic-worker.js")
        .then((reg) => {
          workerRef.current = reg;
        })
        .catch(() => {});

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener("message", (event) => {
        const { type, chunkIndex } = event.data;
        if (type === "CHUNK_UPLOADED") {
          setChunkCount(chunkIndex + 1);
        } else if (type === "CHUNK_ERROR") {
          // Chunk upload error - non-critical
        }
      });
    }
  }, []);

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch (err) {
      // Wake Lock not available
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const startRecording = useCallback(
    async (panicSessionId: string) => {
      if (!user) return;
      setError(null);
      sessionIdRef.current = panicSessionId;
      currentChunkRef.current = 0;
      setChunkCount(0);

      try {
        // Request microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
        });
        streamRef.current = stream;

        // Request wake lock
        await requestWakeLock();

        // Get auth token for SW
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || "";

        // Notify service worker
        if (workerRef.current?.active) {
          workerRef.current.active.postMessage({
            type: "START_RECORDING",
            data: {
              sessionId: panicSessionId,
              supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
              supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          });
        }

        // Start recording in chunks
        const startChunkRecording = () => {
          if (!streamRef.current) return;

          const recorder = new MediaRecorder(streamRef.current, {
            mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
              ? "audio/webm;codecs=opus"
              : "audio/webm",
          });

          const chunks: BlobPart[] = [];
          const chunkStartTime = new Date().toISOString();

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: "audio/webm" });
            const chunkEndTime = new Date().toISOString();
            const idx = currentChunkRef.current;

            // Upload via service worker
            if (workerRef.current?.active) {
              workerRef.current.active.postMessage({
                type: "UPLOAD_CHUNK",
                data: {
                  blob,
                  sessionId: panicSessionId,
                  chunkIndex: idx,
                  startTime: chunkStartTime,
                  endTime: chunkEndTime,
                },
              });
            }

            currentChunkRef.current++;
          };

          recorder.start();
          mediaRecorderRef.current = recorder;

          // Stop after chunk duration, then start new chunk
          chunkIntervalRef.current = setTimeout(() => {
            if (recorder.state === "recording") {
              recorder.stop();
              // Start next chunk
              if (sessionIdRef.current) {
                startChunkRecording();
              }
            }
          }, CHUNK_DURATION_MS);
        };

        startChunkRecording();
        setIsRecording(true);
      } catch (err: any) {
        console.error("[PanicRecording] Start error:", err);
        setError(err.message || "Failed to start recording");
      }
    },
    [user]
  );

  const stopRecording = useCallback(async () => {
    // Stop media recorder
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    // Stop stream tracks
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Clear interval
    if (chunkIntervalRef.current) {
      clearTimeout(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    // Notify service worker
    if (workerRef.current?.active) {
      workerRef.current.active.postMessage({ type: "STOP_RECORDING" });
    }

    // Release wake lock
    releaseWakeLock();

    sessionIdRef.current = null;
    setIsRecording(false);
  }, []);

  return { isRecording, chunkCount, error, startRecording, stopRecording };
}

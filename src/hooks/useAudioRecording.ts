import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { user } = useAuth();

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
    } catch {
      setError("Failed to access microphone. Please grant permission.");
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !user) {
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorderRef.current?.mimeType || "audio/webm" 
        });
        
        // Recording stopped

        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());

        // Upload to Supabase Storage
        const fileName = `${user.id}/${Date.now()}.webm`;
        
        const { data, error: uploadError } = await supabase.storage
          .from("audio-evidence")
          .upload(fileName, blob, {
            contentType: blob.type,
            upsert: false,
          });

        if (uploadError) {
          void uploadError;
          setError("Failed to upload audio evidence.");
          resolve(null);
        } else {
          const { data: urlData } = supabase.storage
            .from("audio-evidence")
            .getPublicUrl(data.path);
          
          // Upload successful
          setAudioUrl(urlData.publicUrl);
          resolve(urlData.publicUrl);
        }

        setIsRecording(false);
        chunksRef.current = [];
      };

      mediaRecorderRef.current.stop();
    });
  }, [user]);

  return {
    isRecording,
    audioUrl,
    error,
    startRecording,
    stopRecording,
  };
};

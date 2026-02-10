/**
 * Timeline Playback Hook
 * Fetches movement data for panic/look-after-me sessions for replay
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TimelinePoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number | null;
  accuracy: number | null;
  isMoving: boolean | null;
  locationName: string | null;
}

export interface TimelineData {
  sessionId: string;
  points: TimelinePoint[];
  startedAt: string;
  endedAt: string | null;
  duration: number; // seconds
}

export const useTimelinePlayback = () => {
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadPanicTimeline = useCallback(async (sessionId: string) => {
    setLoading(true);

    const [{ data: session }, { data: logs }] = await Promise.all([
      supabase.from("panic_sessions").select("started_at, ended_at").eq("id", sessionId).single(),
      supabase.from("panic_location_logs")
        .select("lat, lng, recorded_at, speed, accuracy, is_moving, location_name")
        .eq("panic_session_id", sessionId)
        .order("recorded_at", { ascending: true }),
    ]);

    if (session && logs) {
      const startTime = new Date(session.started_at).getTime();
      const endTime = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();

      setTimeline({
        sessionId,
        points: logs.map(l => ({
          lat: l.lat,
          lng: l.lng,
          timestamp: l.recorded_at,
          speed: l.speed,
          accuracy: l.accuracy,
          isMoving: l.is_moving,
          locationName: l.location_name,
        })),
        startedAt: session.started_at,
        endedAt: session.ended_at,
        duration: Math.round((endTime - startTime) / 1000),
      });
      setPlaybackIndex(0);
    }
    setLoading(false);
  }, []);

  const play = useCallback((speedMultiplier: number = 1) => {
    if (!timeline || timeline.points.length === 0) return;
    setIsPlaying(true);

    intervalRef.current = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev >= timeline.points.length - 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / speedMultiplier);
  }, [timeline]);

  const pause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
  }, []);

  const seekTo = useCallback((index: number) => {
    if (!timeline) return;
    setPlaybackIndex(Math.min(index, timeline.points.length - 1));
  }, [timeline]);

  const reset = useCallback(() => {
    pause();
    setPlaybackIndex(0);
  }, [pause]);

  const currentPoint = timeline?.points[playbackIndex] || null;

  return {
    timeline,
    loading,
    currentPoint,
    playbackIndex,
    isPlaying,
    loadPanicTimeline,
    play,
    pause,
    seekTo,
    reset,
  };
};

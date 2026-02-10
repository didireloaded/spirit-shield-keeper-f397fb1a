/**
 * Timeline Playback Component
 * Replay movement for panic or trip sessions
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, Clock, MapPin, Zap } from "lucide-react";
import { useTimelinePlayback } from "@/hooks/useTimelinePlayback";
import { formatDistanceToNow } from "date-fns";

interface Props {
  sessionId: string;
  sessionType: "panic" | "trip";
}

export function TimelinePlayer({ sessionId, sessionType }: Props) {
  const {
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
  } = useTimelinePlayback();

  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (sessionType === "panic") loadPanicTimeline(sessionId);
  }, [sessionId, sessionType, loadPanicTimeline]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4 animate-spin" />
          Loading timeline...
        </div>
      </div>
    );
  }

  if (!timeline || timeline.points.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground">No movement data for this session</p>
      </div>
    );
  }

  const progress = timeline.points.length > 1
    ? (playbackIndex / (timeline.points.length - 1)) * 100
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Timeline Playback
        </h4>
        <span className="text-xs text-muted-foreground">
          {timeline.points.length} points · {Math.round(timeline.duration / 60)}min
        </span>
      </div>

      {/* Current Point Info */}
      {currentPoint && (
        <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>{currentPoint.locationName || `${currentPoint.lat.toFixed(4)}, ${currentPoint.lng.toFixed(4)}`}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{new Date(currentPoint.timestamp).toLocaleTimeString()}</span>
            {currentPoint.speed !== null && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {(currentPoint.speed * 3.6).toFixed(0)} km/h
              </span>
            )}
            {currentPoint.isMoving && (
              <span className="text-warning">Moving</span>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={timeline.points.length - 1}
          value={playbackIndex}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button onClick={reset} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <SkipBack className="w-4 h-4" />
        </button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => isPlaying ? pause() : play(playbackSpeed)}
          className="p-3 bg-primary text-primary-foreground rounded-full"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </motion.button>

        <div className="flex gap-1">
          {[1, 2, 5].map(speed => (
            <button
              key={speed}
              onClick={() => { setPlaybackSpeed(speed); if (isPlaying) { pause(); play(speed); }}}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                playbackSpeed === speed ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{new Date(timeline.startedAt).toLocaleTimeString()}</span>
        <span>{playbackIndex + 1}/{timeline.points.length}</span>
        <span>{timeline.endedAt ? new Date(timeline.endedAt).toLocaleTimeString() : "Active"}</span>
      </div>
    </div>
  );
}

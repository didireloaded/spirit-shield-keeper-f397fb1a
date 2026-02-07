/**
 * ETA Display Component
 * Shows calculated ETA with traffic info and accept button
 */

import { motion } from 'framer-motion';
import { Navigation, Clock } from 'lucide-react';

interface ETADisplayProps {
  eta: {
    duration: number;
    distance: number;
    arrivalTime: string;
    trafficLevel: 'light' | 'moderate' | 'heavy';
  };
  onAccept: (time: string) => void;
}

export function ETADisplay({ eta, onAccept }: ETADisplayProps) {
  const trafficColors = {
    light: 'text-success bg-success/10',
    moderate: 'text-warning bg-warning/10',
    heavy: 'text-destructive bg-destructive/10',
  };

  const trafficIcons = { light: '🟢', moderate: '🟡', heavy: '🔴' };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-primary/5 border border-primary/20 rounded-xl p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Navigation className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Smart ETA Calculated</p>
          <p className="text-xs text-muted-foreground">
            {(eta.distance / 1000).toFixed(1)} km • {eta.duration} min
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Estimated Arrival:</span>
        </div>
        <span className="text-lg font-bold text-primary">{eta.arrivalTime}</span>
      </div>

      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${trafficColors[eta.trafficLevel]}`}>
        <span>{trafficIcons[eta.trafficLevel]}</span>
        <span className="text-sm font-medium capitalize">{eta.trafficLevel} Traffic</span>
      </div>

      <button
        onClick={() => onAccept(eta.arrivalTime)}
        className="w-full mt-3 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Use This Arrival Time
      </button>
    </motion.div>
  );
}

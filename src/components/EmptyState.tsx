/**
 * Reusable empty state component for production-ready screens.
 * Handles various empty state scenarios with appropriate messaging.
 */

import { motion } from "framer-motion";
import { 
  Shield, MapPin, AlertTriangle, MessageCircle, Users, 
  WifiOff, MapPinOff, Loader2, RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateType = 
  | "no-alerts"
  | "no-incidents"
  | "no-posts"
  | "no-watchers"
  | "no-location"
  | "offline"
  | "loading"
  | "error"
  | "no-permissions";

interface EmptyStateProps {
  type: EmptyStateType;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

const emptyStateConfig: Record<EmptyStateType, {
  icon: any;
  title: string;
  description: string;
  iconColor: string;
  iconBg: string;
}> = {
  "no-alerts": {
    icon: Shield,
    title: "All Clear",
    description: "No active alerts in your area right now. Stay vigilant.",
    iconColor: "text-success",
    iconBg: "bg-success/10",
  },
  "no-incidents": {
    icon: MapPin,
    title: "No Incidents Nearby",
    description: "No reported incidents near your current location.",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  "no-posts": {
    icon: MessageCircle,
    title: "No Community Updates",
    description: "Be the first to share a safety update in your area.",
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted/20",
  },
  "no-watchers": {
    icon: Users,
    title: "No Trusted Contacts",
    description: "Add trusted contacts who can see your location during emergencies.",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  "no-location": {
    icon: MapPinOff,
    title: "Location Required",
    description: "Enable location services to see nearby alerts and incidents.",
    iconColor: "text-warning",
    iconBg: "bg-warning/10",
  },
  "offline": {
    icon: WifiOff,
    title: "You're Offline",
    description: "Check your internet connection to see the latest updates.",
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted/20",
  },
  "loading": {
    icon: Loader2,
    title: "Loading",
    description: "Fetching the latest data...",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  "error": {
    icon: AlertTriangle,
    title: "Something Went Wrong",
    description: "We couldn't load the data. Please try again.",
    iconColor: "text-destructive",
    iconBg: "bg-destructive/10",
  },
  "no-permissions": {
    icon: Shield,
    title: "Permissions Required",
    description: "This app needs certain permissions to keep you safe.",
    iconColor: "text-warning",
    iconBg: "bg-warning/10",
  },
};

export const EmptyState = ({ type, onRetry, className = "", compact = false }: EmptyStateProps) => {
  const config = emptyStateConfig[type];
  const Icon = config.icon;
  const isLoading = type === "loading";
  
  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-card rounded-xl ${className}`}>
        <div className={`p-2 rounded-lg ${config.iconBg}`}>
          <Icon className={`w-5 h-5 ${config.iconColor} ${isLoading ? "animate-spin" : ""}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{config.title}</p>
          <p className="text-xs text-muted-foreground truncate">{config.description}</p>
        </div>
        {onRetry && type !== "loading" && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center py-12 px-6 bg-card rounded-xl ${className}`}
    >
      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${config.iconBg}`}>
        <Icon className={`w-8 h-8 ${config.iconColor} ${isLoading ? "animate-spin" : ""}`} />
      </div>
      <h3 className="font-semibold text-lg">{config.title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
        {config.description}
      </p>
      {onRetry && type !== "loading" && (
        <Button 
          variant="outline" 
          className="mt-4" 
          onClick={onRetry}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </motion.div>
  );
};

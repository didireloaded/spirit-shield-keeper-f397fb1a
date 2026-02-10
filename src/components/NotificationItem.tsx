import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { 
  MessageCircle, 
  ThumbsUp, 
  AlertTriangle, 
  Users, 
  Bell,
  X,
  MapPin,
  Shield,
  Siren
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type Priority = "low" | "normal" | "high";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  read: boolean;
  created_at: string;
  priority?: Priority;
  actor_id?: string;
  entity_id?: string;
  entity_type?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
}

const getNotificationIcon = (type: string, priority?: Priority) => {
  if (priority === "high") {
    return <Siren className="h-4 w-4" />;
  }
  
  switch (type) {
    case "comment":
      return <MessageCircle className="h-4 w-4" />;
    case "reaction":
      return <ThumbsUp className="h-4 w-4" />;
    case "panic_alert":
      return <AlertTriangle className="h-4 w-4" />;
    case "alert_update":
      return <MapPin className="h-4 w-4" />;
    case "watcher_request":
    case "watcher_response":
      return <Users className="h-4 w-4" />;
    case "authority_update":
      return <Shield className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getNotificationColor = (type: string, priority?: Priority) => {
  if (priority === "high") {
    return "bg-destructive/10 text-destructive";
  }
  
  switch (type) {
    case "panic_alert":
      return "bg-destructive/10 text-destructive";
    case "comment":
      return "bg-primary/10 text-primary";
    case "reaction":
      return "bg-success/10 text-success";
    case "watcher_request":
    case "watcher_response":
      return "bg-warning/10 text-warning";
    case "authority_update":
      return "bg-success/10 text-success";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getNavigationPath = (notification: Notification): string | null => {
  // Use structured data if available (from dispatcher)
  const data = notification.data as Record<string, unknown> | null;
  if (data?.url && typeof data.url === "string") return data.url;

  const relatedType = data?.relatedType as string | undefined;
  const relatedId = notification.entity_id;

  switch (relatedType || notification.entity_type) {
    case "panic":
    case "panic_session": {
      let url = `/map?panic=${relatedId}`;
      if (data?.lat && data?.lng) url += `&lat=${data.lat}&lng=${data.lng}&zoom=16`;
      return url;
    }
    case "incident":
    case "alert": {
      let url = `/map?incident=${relatedId}`;
      if (data?.lat && data?.lng) url += `&lat=${data.lat}&lng=${data.lng}&zoom=15`;
      return url;
    }
    case "amber":
      return `/amber-chat/${relatedId}`;
    case "lookAfterMe":
      return "/look-after-me";
    case "community_post":
      return "/community";
    case "watcher":
      return "/watchers";
    default:
      return null;
  }
};

export function NotificationItem({ notification, onClick, onDelete }: NotificationItemProps) {
  const navigate = useNavigate();
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });
  const isHighPriority = notification.priority === "high";

  const handleClick = () => {
    onClick();
    const path = getNavigationPath(notification);
    if (path) {
      navigate(path);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        "group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
        notification.read 
          ? "bg-transparent hover:bg-muted/50" 
          : isHighPriority
            ? "bg-destructive/5 hover:bg-destructive/10 border-l-2 border-destructive"
            : "bg-primary/5 hover:bg-primary/10"
      )}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className={cn(
          "absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full",
          isHighPriority ? "bg-destructive animate-pulse" : "bg-primary"
        )} />
      )}

      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
        getNotificationColor(notification.type, notification.priority)
      )}>
        {isHighPriority ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            {getNotificationIcon(notification.type, notification.priority)}
          </motion.div>
        ) : (
          getNotificationIcon(notification.type, notification.priority)
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          !notification.read && "font-semibold",
          isHighPriority && "text-destructive"
        )}>
          {notification.title}
        </p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.body}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground/70">
            {timeAgo}
          </p>
          {isHighPriority && !notification.read && (
            <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
              URGENT
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 h-6 w-6 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}

import { formatDistanceToNow } from "date-fns";
import { 
  MessageCircle, 
  ThumbsUp, 
  AlertTriangle, 
  Users, 
  Bell,
  X,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  read: boolean;
  created_at: string;
  actor_id?: string;
  entity_id?: string;
  entity_type?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "comment":
      return <MessageCircle className="h-4 w-4" />;
    case "reaction":
      return <ThumbsUp className="h-4 w-4" />;
    case "panic_alert":
      return <AlertTriangle className="h-4 w-4 text-danger" />;
    case "alert_update":
      return <MapPin className="h-4 w-4" />;
    case "watcher_request":
    case "watcher_response":
      return <Users className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "panic_alert":
      return "bg-danger/10 text-danger";
    case "comment":
      return "bg-info/10 text-info";
    case "reaction":
      return "bg-success/10 text-success";
    case "watcher_request":
    case "watcher_response":
      return "bg-warning/10 text-warning";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function NotificationItem({ notification, onClick, onDelete }: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
        notification.read 
          ? "bg-transparent hover:bg-muted/50" 
          : "bg-primary/5 hover:bg-primary/10"
      )}
      onClick={onClick}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
      )}

      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
        getNotificationColor(notification.type)
      )}>
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          !notification.read && "font-semibold"
        )}>
          {notification.title}
        </p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {timeAgo}
        </p>
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
    </div>
  );
}

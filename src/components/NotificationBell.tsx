import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Settings, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    groupedNotifications,
    unreadCount,
    highPriorityUnread,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestPermission,
  } = useNotifications();

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
    setOpen(false);
  };

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* Notification badge - different states */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className={cn(
                  "absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center",
                  highPriorityUnread
                    ? "bg-destructive"
                    : "bg-primary"
                )}
              >
                {highPriorityUnread ? (
                  <motion.div
                    className="h-2 w-2 rounded-full bg-white"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                ) : (
                  <span className="text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "•" : ""}
                  </span>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Notifications</SheetTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-muted-foreground h-8"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setOpen(false);
                  navigate("/settings/notifications");
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-5rem)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : Object.keys(groupedNotifications).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
                You'll be notified about important activity and alerts
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={handleEnableNotifications}
              >
                <Volume2 className="h-4 w-4" />
                Enable Push Notifications
              </Button>
            </div>
          ) : (
            <div className="p-2">
              {["Today", "Yesterday", "Earlier"].map((group) => {
                const notifications = groupedNotifications[group];
                if (!notifications || notifications.length === 0) return null;

                return (
                  <div key={group} className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground px-3 py-2 uppercase tracking-wider">
                      {group}
                    </p>
                    <AnimatePresence mode="popLayout">
                      {notifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onClick={() => handleNotificationClick(notification.id)}
                          onDelete={() => deleteNotification(notification.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

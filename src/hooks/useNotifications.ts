import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "./usePushNotifications";
import { useNotificationAlerts } from "./useNotificationAlerts";
import { useNotificationSettings } from "./useNotificationSettings";

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
  entity_id?: string;
  entity_type?: string;
  actor_id?: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { showNotification, permission, requestPermission } = usePushNotifications();
  const { triggerAlert, triggerEmergencyAlert } = useNotificationAlerts();
  const { shouldNotify } = useNotificationSettings();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [highPriorityUnread, setHighPriorityUnread] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifs = (data || []) as Notification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
      setHighPriorityUnread(notifs.some(n => !n.read && n.priority === "high"));
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          const priority = (newNotification.priority || "normal") as Priority;
          
          // Check if we should notify based on settings
          if (!shouldNotify(priority)) return;

          // Trigger appropriate alert based on priority
          if (priority === "high") {
            setHighPriorityUnread(true);
            await triggerEmergencyAlert();
          } else {
            await triggerAlert(priority);
          }

          // Show browser notification
          if (permission === "granted") {
            showNotification({
              title: newNotification.title,
              body: newNotification.body,
              data: {
                ...(newNotification.data as Record<string, unknown>) || {},
                priority,
                entity_id: newNotification.entity_id,
                entity_type: newNotification.entity_type,
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications, permission, showNotification, triggerAlert, triggerEmergencyAlert, shouldNotify]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Recalculate high priority unread
      setHighPriorityUnread(
        notifications.some(n => n.id !== notificationId && !n.read && n.priority === "high")
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      setHighPriorityUnread(false);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      
      await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = "Yesterday";
    } else {
      groupKey = "Earlier";
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  return {
    notifications,
    groupedNotifications,
    unreadCount,
    highPriorityUnread,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
    requestPermission,
  };
};

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Watcher = Database["public"]["Tables"]["watchers"]["Row"];
type WatcherStatus = Database["public"]["Enums"]["watcher_status"];

interface WatcherWithProfile extends Watcher {
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
  };
}

export const useWatchers = () => {
  const { user } = useAuth();
  const [myWatchers, setMyWatchers] = useState<WatcherWithProfile[]>([]);
  const [watchingMe, setWatchingMe] = useState<WatcherWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<WatcherWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchers = useCallback(async () => {
    if (!user) return;

    // Fetch people I've added as watchers (they watch me)
    const { data: watching } = await supabase
      .from("watchers")
      .select("*")
      .eq("user_id", user.id);

    // Fetch people who added me as their watcher (I watch them)
    const { data: watchedBy } = await supabase
      .from("watchers")
      .select("*")
      .eq("watcher_id", user.id);

    if (watching) {
      // Fetch profiles for watchers
      const watcherIds = watching.map((w) => w.watcher_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone")
        .in("id", watcherIds);

      const withProfiles = watching.map((w) => ({
        ...w,
        profile: profiles?.find((p) => p.id === w.watcher_id),
      }));

      setMyWatchers(withProfiles.filter((w) => w.status === "accepted"));
      setPendingRequests(withProfiles.filter((w) => w.status === "pending"));
    }

    if (watchedBy) {
      // Fetch profiles for people I'm watching
      const userIds = watchedBy.map((w) => w.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone")
        .in("id", userIds);

      const withProfiles = watchedBy.map((w) => ({
        ...w,
        profile: profiles?.find((p) => p.id === w.user_id),
      }));

      setWatchingMe(withProfiles.filter((w) => w.status === "accepted" || w.status === "pending"));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWatchers();

    if (!user) return;

    // Real-time subscription
    const channel = supabase
      .channel("watchers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "watchers" },
        () => {
          fetchWatchers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchWatchers]);

  const inviteWatcher = async (watcherEmail: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Find user by email in profiles (we'd need to look them up differently)
    // For now, we'll search by username or implement invite by phone
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("full_name", `%${watcherEmail}%`)
      .limit(1)
      .single();

    if (!profile) {
      return { error: new Error("User not found") };
    }

    if (profile.id === user.id) {
      return { error: new Error("You cannot add yourself as a watcher") };
    }

    const { error } = await supabase.from("watchers").insert({
      user_id: user.id,
      watcher_id: profile.id,
      status: "pending",
    });

    return { error };
  };

  const inviteWatcherById = async (watcherId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    if (watcherId === user.id) {
      return { error: new Error("You cannot add yourself as a watcher") };
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from("watchers")
      .select("id")
      .eq("user_id", user.id)
      .eq("watcher_id", watcherId)
      .single();

    if (existing) {
      return { error: new Error("This user is already your watcher") };
    }

    const { error } = await supabase.from("watchers").insert({
      user_id: user.id,
      watcher_id: watcherId,
      status: "pending",
    });

    return { error };
  };

  const respondToRequest = async (watcherId: string, status: "accepted" | "rejected") => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("watchers")
      .update({ status })
      .eq("watcher_id", user.id)
      .eq("user_id", watcherId);

    return { error };
  };

  const removeWatcher = async (watcherId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("watchers")
      .delete()
      .eq("user_id", user.id)
      .eq("watcher_id", watcherId);

    return { error };
  };

  const stopWatching = async (userId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("watchers")
      .delete()
      .eq("user_id", userId)
      .eq("watcher_id", user.id);

    return { error };
  };

  return {
    myWatchers,
    watchingMe,
    pendingRequests,
    loading,
    inviteWatcher,
    inviteWatcherById,
    respondToRequest,
    removeWatcher,
    stopWatching,
    refetch: fetchWatchers,
  };
};

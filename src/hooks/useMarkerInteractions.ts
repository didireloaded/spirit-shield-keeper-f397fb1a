import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MarkerReaction {
  id: string;
  marker_id: string;
  user_id: string;
  reaction_type: "verified" | "resolved" | "still_active" | "fake";
  created_at: string;
}

interface MarkerComment {
  id: string;
  marker_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface MarkerStatusHistory {
  id: string;
  marker_id: string;
  user_id: string;
  old_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
}

export const useMarkerInteractions = (markerId: string | null) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<MarkerReaction[]>([]);
  const [comments, setComments] = useState<MarkerComment[]>([]);
  const [statusHistory, setStatusHistory] = useState<MarkerStatusHistory[]>([]);
  const [userReaction, setUserReaction] = useState<MarkerReaction | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch all data for a marker
  const fetchMarkerData = useCallback(async () => {
    if (!markerId) return;
    setLoading(true);

    try {
      // Fetch reactions
      const { data: reactionsData } = await supabase
        .from("marker_reactions")
        .select("*")
        .eq("marker_id", markerId);

      if (reactionsData) {
        setReactions(reactionsData as MarkerReaction[]);
        if (user) {
          const myReaction = reactionsData.find(r => r.user_id === user.id);
          setUserReaction(myReaction as MarkerReaction || null);
        }
      }

      // Fetch comments with profiles (separate query)
      const { data: commentsData } = await supabase
        .from("marker_comments")
        .select("*")
        .eq("marker_id", markerId)
        .order("created_at", { ascending: true });

      if (commentsData) {
        // Fetch profiles for comments
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        const commentsWithProfiles = commentsData.map(comment => ({
          ...comment,
          profile: profiles?.find(p => p.id === comment.user_id) || null,
        }));

        setComments(commentsWithProfiles as MarkerComment[]);
      }

      // Fetch status history
      const { data: historyData } = await supabase
        .from("marker_status_history")
        .select("*")
        .eq("marker_id", markerId)
        .order("created_at", { ascending: false });

      if (historyData) {
        setStatusHistory(historyData as MarkerStatusHistory[]);
      }
    } catch (error) {
      console.error("Error fetching marker data:", error);
    } finally {
      setLoading(false);
    }
  }, [markerId, user]);

  // Real-time subscription
  useEffect(() => {
    if (!markerId) return;

    fetchMarkerData();

    const reactionsChannel = supabase
      .channel(`marker-reactions-${markerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marker_reactions", filter: `marker_id=eq.${markerId}` },
        () => fetchMarkerData()
      )
      .subscribe();

    const commentsChannel = supabase
      .channel(`marker-comments-${markerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marker_comments", filter: `marker_id=eq.${markerId}` },
        () => fetchMarkerData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [markerId, fetchMarkerData]);

  // Add or update reaction
  const addReaction = async (reactionType: MarkerReaction["reaction_type"]) => {
    if (!user || !markerId) {
      toast.error("You must be logged in to react");
      return;
    }

    try {
      if (userReaction) {
        if (userReaction.reaction_type === reactionType) {
          // Remove reaction
          await supabase
            .from("marker_reactions")
            .delete()
            .eq("id", userReaction.id);
          setUserReaction(null);
          toast.success("Reaction removed");
        } else {
          // Update reaction
          await supabase
            .from("marker_reactions")
            .update({ reaction_type: reactionType })
            .eq("id", userReaction.id);
          toast.success("Reaction updated");
        }
      } else {
        // Add new reaction
        await supabase
          .from("marker_reactions")
          .insert({
            marker_id: markerId,
            user_id: user.id,
            reaction_type: reactionType,
          });
        toast.success("Reaction added");
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error("Failed to add reaction");
    }
  };

  // Add comment
  const addComment = async (content: string) => {
    if (!user || !markerId) {
      toast.error("You must be logged in to comment");
      return;
    }

    if (!content.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("marker_comments")
        .insert({
          marker_id: markerId,
          user_id: user.id,
          content: content.trim(),
        });

      if (error) throw error;
      toast.success("Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  // Delete comment
  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("marker_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  // Get reaction counts
  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    reactions,
    comments,
    statusHistory,
    userReaction,
    reactionCounts,
    loading,
    addReaction,
    addComment,
    deleteComment,
    refetch: fetchMarkerData,
  };
};

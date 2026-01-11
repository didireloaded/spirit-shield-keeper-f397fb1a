import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  location_label: string | null;
  visibility: string;
  is_verified: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  user_reaction?: string | null;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useCommunityPosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from("community_posts")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      if (!postsData) {
        setPosts([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(postsData.map((p) => p.user_id))];

      // Fetch profiles for those users
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(
        profilesData?.map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []
      );

      // Fetch user's reactions if logged in
      let reactionMap = new Map<string, string>();
      if (user) {
        const { data: reactions } = await supabase
          .from("community_reactions")
          .select("post_id, reaction_type")
          .eq("user_id", user.id);

        reactionMap = new Map(
          reactions?.map((r) => [r.post_id, r.reaction_type]) || []
        );
      }

      // Combine data
      const postsWithData: CommunityPost[] = postsData.map((post) => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || { full_name: null, avatar_url: null },
        user_reaction: reactionMap.get(post.id) || null,
      }));

      setPosts(postsWithData);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load community posts");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();

    // Set up realtime subscription
    const channel = supabase
      .channel("community-posts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_posts" },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  const createPost = async (
    content: string,
    imageUrl?: string,
    locationLabel?: string
  ) => {
    if (!user) {
      toast.error("You must be logged in to post");
      return { error: new Error("Not authenticated") };
    }

    try {
      const { data, error } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          content,
          image_url: imageUrl || null,
          location_label: locationLabel || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Post created successfully");
      return { data, error: null };
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
      return { data: null, error };
    }
  };

  const toggleReaction = async (postId: string, reactionType: string = "like") => {
    if (!user) {
      toast.error("You must be logged in to react");
      return;
    }

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    try {
      if (post.user_reaction) {
        // Remove reaction
        await supabase
          .from("community_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        // Add reaction
        await supabase.from("community_reactions").insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
        });
      }

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                user_reaction: p.user_reaction ? null : reactionType,
                likes_count: p.user_reaction
                  ? p.likes_count - 1
                  : p.likes_count + 1,
              }
            : p
        )
      );
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast.error("Failed to update reaction");
      fetchPosts(); // Revert to server state
    }
  };

  const reportPost = async (postId: string, reason: string) => {
    if (!user) {
      toast.error("You must be logged in to report");
      return;
    }

    try {
      await supabase.from("community_reports").insert({
        target_type: "post",
        target_id: postId,
        user_id: user.id,
        reason,
      });
      toast.success("Report submitted. Thank you for helping keep our community safe.");
    } catch (error) {
      console.error("Error reporting post:", error);
      toast.error("Failed to submit report");
    }
  };

  return {
    posts,
    loading,
    createPost,
    toggleReaction,
    reportPost,
    refetch: fetchPosts,
  };
};

export const useCommunityComments = (postId: string | null) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;
      if (!commentsData) {
        setComments([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(
        profilesData?.map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []
      );

      // Combine data
      const commentsWithProfiles: CommunityComment[] = commentsData.map((comment) => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || { full_name: null, avatar_url: null },
      }));

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();

    if (!postId) return;

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, fetchComments]);

  const addComment = async (content: string) => {
    if (!user || !postId) {
      toast.error("You must be logged in to comment");
      return { error: new Error("Not authenticated") };
    }

    try {
      const { data, error } = await supabase
        .from("community_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
      return { data: null, error };
    }
  };

  return {
    comments,
    loading,
    addComment,
    refetch: fetchComments,
  };
};

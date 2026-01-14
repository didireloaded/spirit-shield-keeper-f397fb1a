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
  deleted_at: string | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CommunityReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export function useCommunityPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Fetch all posts
  const fetchPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          profile:profiles!community_posts_user_id_fkey(full_name, avatar_url)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Handle the join result - profile comes as array for left join
      const postsWithProfiles = (data || []).map((post: any) => ({
        ...post,
        profile: Array.isArray(post.profile) ? post.profile[0] : post.profile,
      }));
      
      setPosts(postsWithProfiles);
    } catch (error) {
      console.error("Error fetching posts:", error);
      // Fallback: fetch without join if FK doesn't exist
      try {
        const { data, error: fallbackError } = await supabase
          .from("community_posts")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (fallbackError) throw fallbackError;
        setPosts(data || []);
      } catch (fallbackErr) {
        console.error("Fallback fetch failed:", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new post
  const createPost = useCallback(
    async (
      content: string,
      options?: {
        imageUrl?: string;
        locationLabel?: string;
        visibility?: string;
      }
    ) => {
      if (!user) {
        toast.error("You must be logged in to post");
        return null;
      }

      setCreating(true);
      try {
        const { data, error } = await supabase
          .from("community_posts")
          .insert({
            user_id: user.id,
            content,
            image_url: options?.imageUrl || null,
            location_label: options?.locationLabel || null,
            visibility: options?.visibility || "public",
          })
          .select()
          .single();

        if (error) throw error;

        toast.success("Post created successfully");
        await fetchPosts();
        return data;
      } catch (error) {
        console.error("Error creating post:", error);
        toast.error("Failed to create post");
        return null;
      } finally {
        setCreating(false);
      }
    },
    [user, fetchPosts]
  );

  // Delete a post (soft delete)
  const deletePost = useCallback(
    async (postId: string) => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("community_posts")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", postId)
          .eq("user_id", user.id);

        if (error) throw error;

        toast.success("Post deleted");
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        return true;
      } catch (error) {
        console.error("Error deleting post:", error);
        toast.error("Failed to delete post");
        return false;
      }
    },
    [user]
  );

  // Upload image for post
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      return null;
    }
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel("community-posts-realtime")
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

  return {
    posts,
    loading,
    creating,
    createPost,
    deletePost,
    uploadImage,
    refetch: fetchPosts,
  };
}

export function useCommunityComments(postId: string | null) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!postId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("community_comments")
        .select(`
          *,
          profile:profiles!community_comments_user_id_fkey(full_name, avatar_url)
        `)
        .eq("post_id", postId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      const commentsWithProfiles = (data || []).map((comment: any) => ({
        ...comment,
        profile: Array.isArray(comment.profile) ? comment.profile[0] : comment.profile,
      }));
      
      setComments(commentsWithProfiles);
    } catch (error) {
      console.error("Error fetching comments:", error);
      // Fallback without join
      try {
        const { data } = await supabase
          .from("community_comments")
          .select("*")
          .eq("post_id", postId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true });
        setComments(data || []);
      } catch (err) {
        console.error("Fallback comments fetch failed:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const addComment = useCallback(
    async (content: string) => {
      if (!user || !postId) {
        toast.error("Unable to add comment");
        return null;
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

        await fetchComments();
        return data;
      } catch (error) {
        console.error("Error adding comment:", error);
        toast.error("Failed to add comment");
        return null;
      }
    },
    [user, postId, fetchComments]
  );

  useEffect(() => {
    if (postId) {
      fetchComments();

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
    }
  }, [postId, fetchComments]);

  return { comments, loading, addComment, refetch: fetchComments };
}

export function useCommunityReactions(postId: string | null) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<CommunityReaction[]>([]);
  const [userReaction, setUserReaction] = useState<string | null>(null);

  const fetchReactions = useCallback(async () => {
    if (!postId) return;

    try {
      const { data, error } = await supabase
        .from("community_reactions")
        .select("*")
        .eq("post_id", postId);

      if (error) throw error;
      setReactions(data || []);

      if (user) {
        const myReaction = data?.find((r) => r.user_id === user.id);
        setUserReaction(myReaction?.reaction_type || null);
      }
    } catch (error) {
      console.error("Error fetching reactions:", error);
    }
  }, [postId, user]);

  const toggleReaction = useCallback(
    async (reactionType: string) => {
      if (!user || !postId) {
        toast.error("You must be logged in to react");
        return;
      }

      try {
        if (userReaction === reactionType) {
          // Remove reaction
          await supabase
            .from("community_reactions")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id);
          setUserReaction(null);
        } else {
          // Remove existing and add new
          await supabase
            .from("community_reactions")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id);

          await supabase.from("community_reactions").insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
          });
          setUserReaction(reactionType);
        }

        await fetchReactions();
      } catch (error) {
        console.error("Error toggling reaction:", error);
        toast.error("Failed to update reaction");
      }
    },
    [user, postId, userReaction, fetchReactions]
  );

  useEffect(() => {
    if (postId) {
      fetchReactions();
    }
  }, [postId, fetchReactions]);

  return { reactions, userReaction, toggleReaction, refetch: fetchReactions };
}

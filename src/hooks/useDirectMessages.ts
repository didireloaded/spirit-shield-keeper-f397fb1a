import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Message = Database["public"]["Tables"]["messages"]["Row"];

interface DirectMessage extends Message {
  sender_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string | null;
  participant_avatar: string | null;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
}

export const useDirectMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Fetch all conversations for the current user
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    // Get all conversation participations for this user
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!participations || participations.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const conversationIds = participations.map((p) => p.conversation_id);

    // For each conversation, get the other participant and last message
    const conversationsData: Conversation[] = [];

    for (const convId of conversationIds) {
      // Get other participant
      const { data: otherParticipant } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", convId)
        .neq("user_id", user.id)
        .single();

      if (!otherParticipant) continue;

      // Get their profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", otherParticipant.user_id)
        .single();

      // Get last message
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Count unread messages
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", convId)
        .neq("sender_id", user.id)
        .is("read_at", null);

      conversationsData.push({
        id: convId,
        participant_id: otherParticipant.user_id,
        participant_name: profile?.full_name || null,
        participant_avatar: profile?.avatar_url || null,
        last_message: lastMsg?.content || null,
        last_message_time: lastMsg?.created_at || null,
        unread_count: count || 0,
      });
    }

    // Sort by last message time
    conversationsData.sort((a, b) => {
      if (!a.last_message_time) return 1;
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
    });

    setConversations(conversationsData);
    setLoading(false);
  }, [user]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    setActiveConversationId(conversationId);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) {
      // Get sender profiles
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", senderIds);

      const messagesWithProfiles = data.map((msg) => ({
        ...msg,
        sender_profile: profiles?.find((p) => p.id === msg.sender_id),
      }));

      setMessages(messagesWithProfiles);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .is("read_at", null);
    }
  }, [user]);

  // Start or get conversation with a user
  const startConversation = useCallback(async (otherUserId: string) => {
    if (!user) return null;

    // Check if conversation already exists
    const { data: myConvos } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvos) {
      for (const conv of myConvos) {
        const { data: otherParticipant } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conv.conversation_id)
          .eq("user_id", otherUserId)
          .single();

        if (otherParticipant) {
          return conv.conversation_id;
        }
      }
    }

    // Create new conversation
    const { data: newConvo, error: convoError } = await supabase
      .from("conversations")
      .insert({})
      .select()
      .single();

    if (convoError || !newConvo) return null;

    // Add participants
    await supabase.from("conversation_participants").insert([
      { conversation_id: newConvo.id, user_id: user.id },
      { conversation_id: newConvo.id, user_id: otherUserId },
    ]);

    await fetchConversations();
    return newConvo.id;
  }, [user, fetchConversations]);

  // Send a message
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!user || !content.trim()) return null;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      // Update conversations timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    return data;
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    fetchConversations();

    if (!user) return;

    // Subscribe to new messages
    const channel = supabase
      .channel("dm-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // If in active conversation, add message
          if (newMessage.conversation_id === activeConversationId) {
            setMessages((prev) => [...prev, newMessage]);
          }
          
          // Refresh conversations list
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeConversationId, fetchConversations]);

  return {
    conversations,
    messages,
    loading,
    activeConversationId,
    fetchConversations,
    fetchMessages,
    startConversation,
    sendMessage,
    setActiveConversationId,
  };
};

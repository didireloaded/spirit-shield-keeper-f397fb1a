/**
 * CommunityMessage Stream
 * Real-time subscription for chat messages (community threads)
 * Maps to: CommunityThread + CommunityMessage
 * 
 * RULES:
 * - Pushes updates instantly
 * - No refresh buttons, no timers
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CommunityMessage {
  messageId: string;
  threadId: string;
  senderId: string;
  message: string;
  createdAt: string;
  type?: string;
}

export function useCommunityMessageStream(threadId?: string) {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!threadId) { setLoading(false); return; }

    try {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_room_id", threadId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(200);

      setMessages(
        (data || []).map((m) => ({
          messageId: m.id,
          threadId: m.chat_room_id,
          senderId: m.user_id,
          message: m.message,
          createdAt: m.created_at || new Date().toISOString(),
          type: m.type || "text",
        }))
      );
    } catch (e) {
      console.error("[CommunityMessageStream] error:", e);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    fetchMessages();

    if (!threadId) return;

    const channel = supabase
      .channel(`stream-community-messages-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_room_id=eq.${threadId}` },
        (payload) => {
          const m = payload.new as any;
          if (m.is_deleted) return;

          setMessages((prev) => [
            ...prev,
            {
              messageId: m.id,
              threadId: m.chat_room_id,
              senderId: m.user_id,
              message: m.message,
              createdAt: m.created_at || new Date().toISOString(),
              type: m.type || "text",
            },
          ]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages, threadId]);

  return { messages, loading, refetch: fetchMessages };
}

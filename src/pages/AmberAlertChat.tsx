/**
 * Amber Alert Community Chat
 * Real-time coordination room for amber alert situations
 */

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MapPin, Camera, Users, AlertTriangle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  chat_room_id: string;
  user_id: string;
  message: string;
  type: string;
  sighting_latitude: number | null;
  sighting_longitude: number | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
}

interface ChatRoom {
  id: string;
  title: string;
  description: string | null;
  participant_count: number;
  is_active: boolean;
  panic_session_id: string | null;
}

const AmberAlertChat = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!roomId) return;

    const fetchRoom = async () => {
      const { data } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (data) setChatRoom(data);
    };

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_room_id", roomId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        setMessages(data.map(m => ({ ...m, profile: profileMap.get(m.user_id) })));
      }
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    };

    fetchRoom();
    fetchMessages();

    // Real-time messages
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `chat_room_id=eq.${roomId}`,
      }, async (payload) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", payload.new.user_id)
          .single();

        const newMsg: ChatMessage = {
          ...(payload.new as any),
          profile,
        };
        setMessages(prev => [...prev, newMsg]);
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [roomId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !roomId) return;

    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      chat_room_id: roomId,
      user_id: user.id,
      message: newMessage.trim(),
      type: "text",
    });

    if (error) {
      toast.error("Failed to send message");
    }
    setNewMessage("");
    setSending(false);
  };

  const reportSighting = async () => {
    if (!user || !roomId) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await supabase.from("chat_messages").insert({
          chat_room_id: roomId,
          user_id: user.id,
          message: "📍 Reported a sighting at this location",
          type: "sighting",
          sighting_latitude: latitude,
          sighting_longitude: longitude,
        });
        toast.success("Sighting reported!");
      },
      () => toast.error("Could not get location")
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!chatRoom) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Chat room not found</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-primary hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-warning/10 border-b-2 border-warning/30 p-4 safe-top">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}>
            <AlertTriangle className="w-6 h-6 text-warning" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm text-warning truncate">{chatRoom.title}</h1>
            <p className="text-xs text-muted-foreground">
              {chatRoom.participant_count} people helping
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollable">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.type === "system" ? "justify-center" : ""}`}
            >
              {msg.type === "system" ? (
                <div className="bg-muted px-4 py-2 rounded-full text-xs text-center max-w-md">
                  {msg.message}
                </div>
              ) : (
                <>
                  {msg.profile?.avatar_url ? (
                    <img src={msg.profile.avatar_url} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{msg.profile?.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className={`rounded-lg p-3 ${
                      msg.user_id === user?.id ? "bg-primary/10" : "bg-card"
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                      {msg.type === "sighting" && msg.sighting_latitude && (
                        <a
                          href={`https://www.google.com/maps?q=${msg.sighting_latitude},${msg.sighting_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" />
                          View sighting location
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4 space-y-2 safe-bottom">
        <div className="flex gap-2">
          <button
            onClick={reportSighting}
            className="flex-1 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Report Sighting
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Share information..."
            className="flex-1 px-4 py-3 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ fontSize: "16px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="px-4 py-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmberAlertChat;

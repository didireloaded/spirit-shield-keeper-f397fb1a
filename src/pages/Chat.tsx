import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Send, ArrowLeft, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

const mockChats = [
  {
    id: "1",
    name: "Neighborhood Watch - Windhoek Central",
    lastMessage: "Stay safe everyone! Police patrol scheduled for tonight.",
    time: "2 min ago",
    unread: 3,
    avatar: "🏘️",
  },
  {
    id: "2",
    name: "Kleine Kuppe Residents",
    lastMessage: "Has anyone seen the white van again?",
    time: "15 min ago",
    unread: 1,
    avatar: "🏡",
  },
  {
    id: "3",
    name: "Grove Mall Security",
    lastMessage: "All clear at the mall. Normal operations resumed.",
    time: "1 hour ago",
    unread: 0,
    avatar: "🛡️",
  },
  {
    id: "4",
    name: "Namibian Police Updates",
    lastMessage: "Suspect in custody. Thank you for your cooperation.",
    time: "2 hours ago",
    unread: 0,
    avatar: "👮",
  },
];

const Chat = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const filteredChats = mockChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;

    // Add local message immediately
    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender_id: user.id,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
  };

  if (selectedChat) {
    const chat = mockChats.find((c) => c.id === selectedChat);
    
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Chat Header */}
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center gap-3 h-14 px-4 max-w-lg mx-auto">
            <button
              onClick={() => setSelectedChat(null)}
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
              {chat?.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm truncate">{chat?.name}</h2>
              <p className="text-xs text-muted-foreground">12 members</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${
                  msg.sender_id === user?.id ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                    msg.sender_id === user?.id
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
              </motion.div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="sticky bottom-0 glass border-t border-border p-4">
          <div className="flex items-center gap-2 max-w-lg mx-auto">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 px-4 py-3 bg-secondary rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Messages" />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Quick Join */}
        <div className="mb-6">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">Join Your Area Chat</p>
              <p className="text-xs text-muted-foreground">
                Connect with neighbors in your vicinity
              </p>
            </div>
            <div className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-lg">
              Join
            </div>
          </motion.button>
        </div>

        {/* Chat List */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Your Chats
          </h2>

          {filteredChats.map((chat, index) => (
            <motion.button
              key={chat.id}
              onClick={() => setSelectedChat(chat.id)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: 4 }}
              className="w-full p-4 bg-card border border-border rounded-xl text-left hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
                  {chat.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm truncate">
                      {chat.name}
                    </h3>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {chat.time}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {chat.lastMessage}
                  </p>
                </div>
                {chat.unread > 0 && (
                  <span className="w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {chat.unread}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Chat;

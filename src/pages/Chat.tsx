import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Send, ArrowLeft, Users, MessageCircle, Shield } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { useWatchers } from "@/hooks/useWatchers";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    conversations,
    messages,
    loading,
    activeConversationId,
    fetchMessages,
    sendMessage,
    startConversation,
    setActiveConversationId,
  } = useDirectMessages();
  const { myWatchers, watchingMe } = useWatchers();

  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [activeTab, setActiveTab] = useState<"dms" | "groups">("dms");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle incoming chat param
  useEffect(() => {
    const chatId = searchParams.get("chat");
    if (chatId) {
      fetchMessages(chatId);
    }
  }, [searchParams, fetchMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversationId) return;

    await sendMessage(activeConversationId, messageInput);
    setMessageInput("");
  };

  const handleStartDMWithWatcher = async (userId: string) => {
    const conversationId = await startConversation(userId);
    if (conversationId) {
      fetchMessages(conversationId);
    }
  };

  const handleBackToList = () => {
    setActiveConversationId(null);
    navigate("/messages", { replace: true });
  };

  // Get current conversation partner name
  const currentConversation = conversations.find((c) => c.id === activeConversationId);

  // Filter conversations
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.participant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // All watchers for quick access
  const allWatcherContacts = [
    ...myWatchers.map((w) => ({
      id: w.watcher_id,
      name: w.profile?.full_name || "Unknown",
      type: "watcher" as const,
    })),
    ...watchingMe
      .filter((w) => w.status === "accepted")
      .map((w) => ({
        id: w.user_id,
        name: w.profile?.full_name || "Unknown",
        type: "watching" as const,
      })),
  ].filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i); // Remove duplicates

  // Chat view
  if (activeConversationId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Chat Header */}
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center gap-3 h-14 px-4 max-w-lg mx-auto">
            <button
              onClick={handleBackToList}
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm truncate">
                {currentConversation?.participant_name || "Chat"}
              </h2>
              <p className="text-xs text-muted-foreground">Direct Message</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
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
                  <p className="text-xs opacity-60 mt-1">
                    {formatDistanceToNow(new Date(msg.created_at!), { addSuffix: true })}
                  </p>
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
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 px-4 py-3 bg-secondary rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
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
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-secondary rounded-xl p-1">
          <button
            onClick={() => setActiveTab("dms")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "dms"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <MessageCircle className="w-4 h-4 inline mr-2" />
            Direct Messages
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "groups"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Groups
          </button>
        </div>

        {activeTab === "dms" ? (
          <>
            {/* Quick Access to Watchers */}
            {allWatcherContacts.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Quick Message
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allWatcherContacts.slice(0, 5).map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleStartDMWithWatcher(contact.id)}
                      className="flex flex-col items-center gap-2 p-3 bg-card border border-border rounded-xl min-w-[80px] hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-xs font-medium truncate max-w-[70px]">
                        {contact.name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversations List */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Recent Conversations
              </h3>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conv, index) => (
                  <motion.button
                    key={conv.id}
                    onClick={() => fetchMessages(conv.id)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 4 }}
                    className="w-full p-4 bg-card border border-border rounded-xl text-left hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm truncate">
                            {conv.participant_name || "Unknown"}
                          </h3>
                          {conv.last_message_time && (
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {formatDistanceToNow(new Date(conv.last_message_time), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conv.last_message || "No messages yet"}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="text-center py-12 bg-card rounded-xl">
                  <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium mb-1">No Conversations Yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start a conversation with your watchers
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Groups Tab */
          <div className="space-y-2">
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

            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Group chats coming soon!</p>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Chat;

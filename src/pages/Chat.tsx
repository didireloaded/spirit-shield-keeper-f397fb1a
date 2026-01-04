import { motion } from "framer-motion";
import { Search, Users, Send } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

const mockChats = [
  {
    name: "Neighborhood Watch - Windhoek Central",
    lastMessage: "Stay safe everyone! Police patrol scheduled for tonight.",
    time: "2 min ago",
    unread: 3,
    avatar: "🏘️",
  },
  {
    name: "Kleine Kuppe Residents",
    lastMessage: "Has anyone seen the white van again?",
    time: "15 min ago",
    unread: 1,
    avatar: "🏡",
  },
  {
    name: "Grove Mall Security",
    lastMessage: "All clear at the mall. Normal operations resumed.",
    time: "1 hour ago",
    unread: 0,
    avatar: "🛡️",
  },
  {
    name: "Namibian Police Updates",
    lastMessage: "Suspect in custody. Thank you for your cooperation.",
    time: "2 hours ago",
    unread: 0,
    avatar: "👮",
  },
];

const Chat = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Community Chat" />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chats..."
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

          {mockChats.map((chat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: 4 }}
              className="p-4 bg-card border border-border rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors"
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
            </motion.div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Chat;

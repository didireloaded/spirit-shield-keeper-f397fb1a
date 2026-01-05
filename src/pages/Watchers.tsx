import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  ChevronRight,
  Shield,
  Eye,
  Bell,
  Trash2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useWatchers } from "@/hooks/useWatchers";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const Watchers = () => {
  const {
    myWatchers,
    watchingMe,
    pendingRequests,
    loading,
    inviteWatcherById,
    respondToRequest,
    removeWatcher,
    stopWatching,
  } = useWatchers();
  const { permission, requestPermission } = usePushNotifications();

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"watchers" | "watching">("watchers");

  // Search for users
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .ilike("full_name", `%${searchQuery}%`)
        .limit(10);

      setSearchResults(data || []);
      setSearching(false);
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleInvite = async (userId: string, userName: string) => {
    const { error } = await inviteWatcherById(userId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Watcher request sent to ${userName}`);
      setShowAddModal(false);
      setSearchQuery("");
    }
  };

  const handleAccept = async (userId: string) => {
    const { error } = await respondToRequest(userId, "accepted");
    if (error) {
      toast.error("Failed to accept request");
    } else {
      toast.success("Watcher request accepted!");
    }
  };

  const handleReject = async (userId: string) => {
    const { error } = await respondToRequest(userId, "rejected");
    if (error) {
      toast.error("Failed to reject request");
    } else {
      toast.info("Watcher request declined");
    }
  };

  const handleRemoveWatcher = async (watcherId: string) => {
    const { error } = await removeWatcher(watcherId);
    if (error) {
      toast.error("Failed to remove watcher");
    } else {
      toast.success("Watcher removed");
    }
  };

  const handleStopWatching = async (userId: string) => {
    const { error } = await stopWatching(userId);
    if (error) {
      toast.error("Failed to stop watching");
    } else {
      toast.success("Stopped watching user");
    }
  };

  // Request for incoming watcher requests
  const incomingRequests = watchingMe.filter((w) => w.status === "pending");

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Watchers" />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Notification Permission */}
        {permission !== "granted" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-warning/10 border border-warning/30 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-warning mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Enable Notifications</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Get alerts when your watchers need help
                </p>
              </div>
              <button
                onClick={requestPermission}
                className="px-3 py-1.5 bg-warning text-warning-foreground text-xs font-medium rounded-lg"
              >
                Enable
              </button>
            </div>
          </motion.div>
        )}

        {/* Pending Requests from Others */}
        {incomingRequests.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Pending Requests
            </h2>
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {request.profile?.full_name || "Unknown User"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Wants you to be their watcher
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleReject(request.user_id)}
                      className="flex-1 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAccept(request.user_id)}
                      className="flex-1 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:bg-success/90 transition-colors"
                    >
                      Accept
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-secondary rounded-xl p-1">
          <button
            onClick={() => setActiveTab("watchers")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "watchers"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            My Watchers ({myWatchers.length})
          </button>
          <button
            onClick={() => setActiveTab("watching")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "watching"
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            I'm Watching ({watchingMe.filter((w) => w.status === "accepted").length})
          </button>
        </div>

        {/* Content */}
        {activeTab === "watchers" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                People who receive your alerts
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                Add
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
                ))}
              </div>
            ) : myWatchers.length > 0 ? (
              <div className="space-y-3">
                {myWatchers.map((watcher) => (
                  <motion.div
                    key={watcher.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-success" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">
                          {watcher.profile?.full_name || "Unknown User"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {watcher.profile?.phone || "No phone"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveWatcher(watcher.watcher_id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-xl">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <UserPlus className="w-8 h-8 text-primary" />
                </div>
                <p className="font-medium mb-1">No Watchers Yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add trusted contacts to receive your alerts
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg"
                >
                  Add Your First Watcher
                </button>
              </div>
            )}

            {/* Pending sent requests */}
            {pendingRequests.length > 0 && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">Pending Invites</p>
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-3 py-2 text-muted-foreground"
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-sm">
                      {request.profile?.full_name || "Unknown"} - Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <p className="text-sm text-muted-foreground">
              People whose alerts you receive
            </p>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
                ))}
              </div>
            ) : watchingMe.filter((w) => w.status === "accepted").length > 0 ? (
              <div className="space-y-3">
                {watchingMe
                  .filter((w) => w.status === "accepted")
                  .map((watched) => (
                    <motion.div
                      key={watched.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card border border-border rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Eye className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">
                            {watched.profile?.full_name || "Unknown User"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            You're watching them
                          </p>
                        </div>
                        <button
                          onClick={() => handleStopWatching(watched.user_id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-xl">
                <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
                  <Eye className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">Not Watching Anyone</p>
                <p className="text-sm text-muted-foreground">
                  Accept watcher requests to watch over others
                </p>
              </div>
            )}
          </section>
        )}

        {/* Add Watcher Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-end"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-card rounded-t-3xl p-6 max-h-[85vh] overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Add Watcher</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 rounded-full bg-secondary hover:bg-secondary/80"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {searching ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleInvite(user.id, user.full_name || "User")}
                        className="w-full flex items-center gap-3 p-3 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">
                            {user.full_name || "Unknown"}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))
                  ) : searchQuery.length >= 2 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Type at least 2 characters to search
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
};

export default Watchers;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  MessageCircle,
  Phone,
  LogOut,
  Users,
  Bell,
  Edit,
  ArrowLeft,
  Share2,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchers } from "@/hooks/useWatchers";
import { useAlerts } from "@/hooks/useAlerts";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  region: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { myWatchers, watchingMe } = useWatchers();
  const { alerts } = useAlerts();
  const { permission, requestPermission } = usePushNotifications();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<"alerts" | "messages" | "contacts" | "emergency">("alerts");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (data) {
      setProfile(data);
      setEditForm({
        full_name: data.full_name || "",
        username: data.username || "",
        phone: data.phone || "",
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editForm.full_name,
        username: editForm.username,
        phone: editForm.phone,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      setIsEditing(false);
      fetchProfile();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const myAlerts = alerts.filter(a => a.user_id === user?.id);
  const acceptedWatchers = myWatchers.filter(w => w.status === "accepted");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Cover Section */}
      <div className="relative h-48 bg-gradient-to-br from-zinc-800 to-zinc-900">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        {/* Share Button */}
        <button className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors">
          <Share2 className="w-5 h-5 text-white" />
        </button>

        {/* Cover Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <main className="max-w-lg mx-auto px-4 -mt-12 space-y-6 relative z-10">
        {/* Profile Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold">
            {profile?.full_name || user?.email?.split("@")[0] || "User"}
          </h1>
          <p className="text-sm text-muted-foreground">
            SafeGuard Member {profile?.username && `• ${profile.username}`}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Keeping {profile?.region || "Namibia"} safe, one alert at a time. Part of the SafeGuard community dedicated to emergency response and community safety.
          </p>
        </motion.div>

        {/* Quick Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-3"
        >
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-full hover:bg-secondary transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span className="text-sm font-medium">Edit Profile</span>
          </button>
          <button
            onClick={() => navigate("/chat")}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-full hover:bg-secondary transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Messages</span>
          </button>
          <button
            onClick={() => navigate("/authorities")}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-full hover:bg-secondary transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span className="text-sm font-medium">Emergency</span>
          </button>
        </motion.div>

        {/* Stats Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 bg-card border border-border rounded-xl overflow-hidden"
        >
          {[
            { key: "alerts", icon: Shield, label: "Alerts", value: myAlerts.length },
            { key: "messages", icon: MessageCircle, label: "Messages", value: 0 },
            { key: "contacts", icon: Users, label: "Contacts", value: acceptedWatchers.length },
            { key: "emergency", icon: Phone, label: "Emergency", value: 0 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`p-4 flex flex-col items-center gap-1 transition-colors ${
                  isActive ? "bg-secondary" : "hover:bg-secondary/50"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-destructive" : "text-muted-foreground"}`} />
                <span className={`text-xs ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Notification Permission Banner */}
        {permission !== "granted" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-warning/10 border border-warning/30 rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium text-sm">Enable Notifications</p>
                  <p className="text-xs text-muted-foreground">Get alerts for nearby emergencies</p>
                </div>
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

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-4 space-y-3"
        >
          <h3 className="font-semibold">Contact Information</h3>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className={profile?.phone ? "text-foreground" : "text-muted-foreground"}>
              {profile?.phone || "No phone number"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{user?.email}</span>
          </div>
        </motion.div>

        {/* Emergency Contacts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="font-semibold">Emergency Contacts</h3>
          </div>
          {acceptedWatchers.length > 0 ? (
            <div className="space-y-2">
              {acceptedWatchers.slice(0, 3).map((watcher) => (
                <div key={watcher.id} className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{watcher.profile?.full_name || watcher.profile?.phone || "Watcher"}</span>
                </div>
              ))}
              {acceptedWatchers.length > 3 && (
                <button
                  onClick={() => navigate("/watchers")}
                  className="text-xs text-primary hover:underline"
                >
                  +{acceptedWatchers.length - 3} more contacts
                </button>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No emergency contacts added.{" "}
              <button
                onClick={() => navigate("/watchers")}
                className="text-primary hover:underline"
              >
                Add watchers
              </button>
            </div>
          )}
        </motion.div>

        {/* My Activity Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-4 space-y-3"
        >
          <h3 className="font-semibold">Activity Summary</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-xl font-bold text-destructive">{myAlerts.filter(a => a.type === "panic").length}</p>
              <p className="text-xs text-muted-foreground">Panic Alerts</p>
            </div>
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-xl font-bold text-warning">{myAlerts.filter(a => a.type === "amber").length}</p>
              <p className="text-xs text-muted-foreground">Amber Alerts</p>
            </div>
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-xl font-bold text-primary">{watchingMe.filter(w => w.status === "accepted").length}</p>
              <p className="text-xs text-muted-foreground">Watching Me</p>
            </div>
          </div>
        </motion.div>

        {/* Sign Out */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={handleSignOut}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full p-4 bg-card border border-border rounded-xl flex items-center justify-center gap-2 text-destructive font-medium hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </motion.button>
      </main>

      {/* Edit Profile Modal */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setIsEditing(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-xl font-bold">Edit Profile</h2>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Full Name</label>
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Your full name"
                className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Username</label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="@username"
                className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Phone Number</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+264..."
                className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 bg-secondary hover:bg-secondary/80 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
};

export default Profile;

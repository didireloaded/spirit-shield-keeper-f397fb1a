/**
 * Profile Screen
 * Per PDF specs: Avatar upload, bio, profile editing
 * Single source of truth for user identity
 */

import { useState, useEffect, useRef } from "react";
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
  Camera,
  Loader2,
  MapPin,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { myWatchers, watchingMe } = useWatchers();
  const { alerts } = useAlerts();
  const { permission, requestPermission } = usePushNotifications();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
    phone: "",
    region: "",
  });
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
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
        region: data.region || "",
      });
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      // Upload to avatars bucket
      const path = `${user.id}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);

      // Update profile with new avatar URL (add cache buster)
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : null);
      toast.success("Profile photo updated!");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
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
        region: editForm.region,
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

  const myAlerts = alerts.filter((a) => a.user_id === user?.id);
  const acceptedWatchers = myWatchers.filter((w) => w.status === "accepted");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Cover Section */}
      <div className="relative h-32 bg-gradient-to-br from-zinc-800 to-zinc-900">
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

      <main className="max-w-lg mx-auto px-4 -mt-16 space-y-6 relative z-10">
        {/* Avatar Section - Per PDF: Large profile photo, clickable to edit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <Avatar className="w-28 h-28 border-4 border-background shadow-xl">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            
            {/* Avatar Upload Button */}
            <input
              type="file"
              accept="image/*"
              ref={avatarInputRef}
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 p-2 bg-primary rounded-full shadow-lg hover:bg-primary/90 transition-colors"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-primary-foreground" />
              )}
            </button>
          </div>

          {/* Profile Info */}
          <h1 className="text-2xl font-bold mt-4">
            {profile?.full_name || user?.email?.split("@")[0] || "User"}
          </h1>
          <p className="text-sm text-muted-foreground">
            SafeGuard Member {profile?.username && `• @${profile.username}`}
          </p>
          {profile?.region && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {profile.region}
            </p>
          )}
        </motion.div>

        {/* Quick Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-2 justify-center flex-wrap"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="rounded-full gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/messages")}
            className="rounded-full gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Messages
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/authorities")}
            className="rounded-full gap-2"
          >
            <Phone className="w-4 h-4" />
            Emergency
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 bg-card border border-border rounded-xl overflow-hidden"
        >
          {[
            { icon: Shield, label: "Alerts", value: myAlerts.length, color: "text-destructive" },
            { icon: MessageCircle, label: "Messages", value: 0, color: "text-primary" },
            { icon: Users, label: "Watchers", value: acceptedWatchers.length, color: "text-success" },
            { icon: Phone, label: "SOS", value: myAlerts.filter((a) => a.type === "panic").length, color: "text-warning" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="p-3 flex flex-col items-center gap-1 text-center">
                <Icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-lg font-bold">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
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
              <Button size="sm" onClick={requestPermission} className="bg-warning text-warning-foreground">
                Enable
              </Button>
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
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={watcher.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-secondary">
                      {getInitials(watcher.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
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

        {/* History Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <Button
            variant="outline"
            onClick={() => navigate("/history")}
            className="w-full h-12 rounded-xl gap-2"
          >
            <Clock className="w-5 h-5" />
            History
          </Button>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </Button>
        </motion.div>
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

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Region</label>
              <input
                type="text"
                value={editForm.region}
                onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                placeholder="e.g., Windhoek"
                className="w-full px-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                className="flex-1 h-12 rounded-xl"
              >
                Save
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
};

export default Profile;

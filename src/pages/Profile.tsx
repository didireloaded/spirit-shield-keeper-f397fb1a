import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  MapPin,
  Bell,
  Phone,
  Settings,
  ChevronRight,
  LogOut,
  Users,
  Eye,
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchers } from "@/hooks/useWatchers";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNavigate } from "react-router-dom";

const menuItems = [
  {
    icon: Shield,
    label: "Safety Status",
    description: "Currently: Safe",
    color: "text-success",
    path: "/settings",
  },
  {
    icon: Users,
    label: "My Watchers",
    description: "Manage trusted contacts",
    color: "text-primary",
    path: "/watchers",
  },
  {
    icon: MapPin,
    label: "My Locations",
    description: "Home, Work, Favorites",
    color: "text-primary",
    path: "/settings",
  },
  {
    icon: Phone,
    label: "Emergency Contacts",
    description: "Quick dial numbers",
    color: "text-warning",
    path: "/authorities",
  },
  {
    icon: Eye,
    label: "Privacy & Ghost Mode",
    description: "Control your visibility",
    color: "text-muted-foreground",
    path: "/settings",
  },
  {
    icon: Bell,
    label: "Notifications",
    description: "All enabled",
    color: "text-primary",
    path: "/settings",
  },
  {
    icon: Settings,
    label: "Settings",
    description: "Account, Help, About",
    color: "text-muted-foreground",
    path: "/settings",
  },
];

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { myWatchers, watchingMe } = useWatchers();
  const { permission, requestPermission } = usePushNotifications();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Profile" />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full gradient-guardian flex items-center justify-center">
              <User className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user?.email?.split("@")[0] || "User"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-success/10 text-success text-xs font-medium rounded-full safe-glow">
                  ● Safe
                </span>
                <span className="text-xs text-muted-foreground">
                  Windhoek, Namibia
                </span>
              </div>
            </div>
          </div>

          <button className="w-full mt-4 py-2.5 border border-primary text-primary font-medium rounded-xl hover:bg-primary/5 transition-colors">
            Edit Profile
          </button>
        </motion.div>

        {/* Notification Permission Banner */}
        {permission !== "granted" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
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

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Watchers", value: myWatchers.length.toString() },
            { label: "Watching", value: watchingMe.filter(w => w.status === "accepted").length.toString() },
            { label: "Reports", value: "0" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                onClick={() => navigate(item.path)}
                whileHover={{ x: 4 }}
                className={`
                  w-full p-4 flex items-center gap-4 text-left
                  hover:bg-secondary/50 transition-colors
                  ${index < menuItems.length - 1 ? "border-b border-border" : ""}
                `}
              >
                <div className={`${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            );
          })}
        </motion.div>

        {/* Sign Out */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={handleSignOut}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center justify-center gap-2 text-destructive font-medium hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </motion.button>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;

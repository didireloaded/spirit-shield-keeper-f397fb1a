/**
 * Watcher Role Selector
 * Allows changing watcher roles (viewer, responder, emergency_contact)
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, Radio, Phone, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type WatcherRole = "viewer" | "responder" | "emergency_contact";

interface Props {
  watcherId: string;
  currentRole: WatcherRole;
  watcherName: string;
  onRoleChange?: (newRole: WatcherRole) => void;
}

const roleConfig: Record<WatcherRole, { icon: typeof Eye; label: string; description: string; color: string }> = {
  viewer: { icon: Eye, label: "Viewer", description: "Can see your location", color: "text-blue-400" },
  responder: { icon: Radio, label: "Responder", description: "Can comment, escalate & coordinate", color: "text-amber-400" },
  emergency_contact: { icon: Phone, label: "Emergency Contact", description: "Gets override notifications", color: "text-destructive" },
};

export function WatcherRoleSelector({ watcherId, currentRole, watcherName, onRoleChange }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [role, setRole] = useState<WatcherRole>(currentRole);

  const handleRoleChange = async (newRole: WatcherRole) => {
    const { error } = await supabase
      .from("watchers")
      .update({ role: newRole })
      .eq("id", watcherId);

    if (error) {
      toast.error("Failed to update role");
    } else {
      setRole(newRole);
      setShowDropdown(false);
      onRoleChange?.(newRole);
      toast.success(`${watcherName} is now a ${roleConfig[newRole].label}`);
    }
  };

  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 transition-colors ${config.color}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 top-full mt-1 z-50 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          >
            {(Object.entries(roleConfig) as [WatcherRole, typeof config][]).map(([key, cfg]) => {
              const RoleIcon = cfg.icon;
              return (
                <button
                  key={key}
                  onClick={() => handleRoleChange(key)}
                  className={`w-full p-3 text-left hover:bg-secondary/50 transition-colors flex items-start gap-2 ${
                    role === key ? "bg-secondary/30" : ""
                  }`}
                >
                  <RoleIcon className={`w-4 h-4 mt-0.5 ${cfg.color}`} />
                  <div>
                    <p className="text-sm font-medium">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground">{cfg.description}</p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        </>
      )}
    </div>
  );
}

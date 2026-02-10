/**
 * Community Thread Card
 * Type-aware card with accent line, type badge, status badge, location.
 * Collapsed by default — shows title, location, status, comment count.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, MessageCircle, ChevronDown, Radio, Search, AlertTriangle, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CommunityThread, ThreadType } from "@/hooks/useCommunityThreads";

interface CommunityThreadCardProps {
  thread: CommunityThread;
  onOpen?: (thread: CommunityThread) => void;
}

const typeConfig: Record<ThreadType, {
  accentClass: string;
  badgeClass: string;
  label: string;
  icon: typeof Radio;
}> = {
  panic: {
    accentClass: "border-l-destructive",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    label: "Panic",
    icon: Radio,
  },
  amber: {
    accentClass: "border-l-warning",
    badgeClass: "bg-warning/10 text-warning border-warning/30",
    label: "Amber",
    icon: Search,
  },
  incident: {
    accentClass: "border-l-muted-foreground",
    badgeClass: "bg-secondary text-muted-foreground border-border",
    label: "Incident",
    icon: AlertTriangle,
  },
};

const statusLabels: Record<string, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-destructive/10 text-destructive animate-pulse" },
  active: { label: "Active", className: "bg-success/20 text-success" },
  ended: { label: "Ended", className: "bg-muted text-muted-foreground" },
  resolved: { label: "Resolved", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  found: { label: "Found", className: "bg-success/20 text-success" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function CommunityThreadCard({ thread, onOpen }: CommunityThreadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(false);
  const config = typeConfig[thread.type];
  const statusConf = statusLabels[thread.status] ?? statusLabels.active;
  const Icon = config.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card border border-border rounded-2xl overflow-hidden shadow-sm border-l-4 transition-colors",
        config.accentClass,
        muted && "opacity-60"
      )}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0 space-y-2">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", config.badgeClass)}>
              <Icon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", statusConf.className)}>
              {statusConf.label}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-foreground leading-snug truncate">
            {thread.title}
          </h3>

          {/* Location + time */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {thread.location && (
              <span className="flex items-center gap-1 truncate max-w-[140px]">
                <MapPin className="w-3 h-3 shrink-0" />
                {thread.location}
              </span>
            )}
            <span>{timeAgo(thread.createdAt)}</span>
            {thread.commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {thread.commentCount}
              </span>
            )}
          </div>
        </div>

        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform",
          expanded && "rotate-180"
        )} />
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border">
              {/* Extra meta based on type */}
              {thread.type === "amber" && thread.meta.description && (
                <p className="text-xs text-muted-foreground pt-3 leading-relaxed">
                  {thread.meta.description}
                </p>
              )}
              {thread.type === "incident" && thread.meta.description && (
                <p className="text-xs text-muted-foreground pt-3 leading-relaxed">
                  {thread.meta.description}
                </p>
              )}
              {thread.type === "panic" && thread.meta.severity && (
                <p className="text-xs text-muted-foreground pt-3">
                  Severity: <span className="font-medium text-foreground">{thread.meta.severity}</span>
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen?.(thread); }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Open thread
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                  className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  {muted ? "Unmute" : "Mute"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

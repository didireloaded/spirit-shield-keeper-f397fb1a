/**
 * Activity History Page
 * Read-only view of past panic alerts, incidents, and community interactions
 */

import { motion } from "framer-motion";
import { ArrowLeft, Shield, AlertTriangle, MessageCircle, CheckCircle, Eye, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useActivityHistory, ActivityItem } from "@/hooks/useActivityHistory";
import { BottomNav } from "@/components/BottomNav";
import { formatDistanceToNow } from "date-fns";

const typeConfig: Record<string, { icon: typeof Shield; color: string; bg: string }> = {
  panic: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  incident: { icon: Shield, color: "text-warning", bg: "bg-warning/10" },
  community: { icon: MessageCircle, color: "text-primary", bg: "bg-primary/10" },
  check_in: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  verification: { icon: Eye, color: "text-muted-foreground", bg: "bg-muted/20" },
};

function ActivityCard({ item }: { item: ActivityItem }) {
  const config = typeConfig[item.type] || typeConfig.incident;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 p-3 bg-card border border-border rounded-xl"
    >
      <div className={`p-2 rounded-lg ${config.bg} self-start`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate">{item.title}</p>
          {item.status && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">
              {item.status}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
        </div>
      </div>
    </motion.div>
  );
}

export default function ActivityHistory() {
  const navigate = useNavigate();
  const { activities, loading } = useActivityHistory();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 glass border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Activity History</h1>
            <p className="text-xs text-muted-foreground">Your past safety activity</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : activities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-muted/20 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No Activity Yet</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              Your safety activity will appear here as you use the app.
            </p>
          </motion.div>
        ) : (
          activities.map((item) => <ActivityCard key={`${item.type}-${item.id}`} item={item} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
}

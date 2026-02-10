/**
 * History Page
 * Read-only, calm, logbook-style view of resolved alerts and ended sessions.
 * Accessible from Profile. Not on Home or Map.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, AlertTriangle, Search as SearchIcon, MapPin, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";

type HistoryFilter = "all" | "panic" | "amber" | "lam" | "incident";

interface HistoryItem {
  id: string;
  type: "panic" | "amber" | "lam" | "incident";
  title: string;
  location?: string;
  started_at: string;
  ended_at?: string | null;
  status: string;
  user_name?: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; dotColor: string }> = {
  panic: { label: "Panic Alert", color: "text-red-400", bg: "bg-red-500/10", dotColor: "bg-red-500" },
  amber: { label: "Amber Alert", color: "text-amber-400", bg: "bg-amber-500/10", dotColor: "bg-amber-500" },
  lam: { label: "Look After Me", color: "text-emerald-400", bg: "bg-emerald-500/10", dotColor: "bg-emerald-500" },
  incident: { label: "Incident", color: "text-neutral-400", bg: "bg-neutral-500/10", dotColor: "bg-neutral-400" },
};

const FILTER_TABS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "panic", label: "Panic" },
  { key: "amber", label: "Amber" },
  { key: "lam", label: "Look After Me" },
  { key: "incident", label: "Incidents" },
];

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const results: HistoryItem[] = [];

    // Panic sessions (ended/resolved only)
    const { data: panics } = await supabase
      .from("panic_sessions")
      .select("id, status, started_at, ended_at, incident_type, location_name, user_id")
      .eq("user_id", user.id)
      .in("status", ["ended", "interrupted"])
      .order("started_at", { ascending: false })
      .limit(100);

    panics?.forEach((p) =>
      results.push({
        id: p.id,
        type: "panic",
        title: p.incident_type || "Panic Alert",
        location: p.location_name || undefined,
        started_at: p.started_at,
        ended_at: p.ended_at,
        status: "Resolved",
      })
    );

    // Amber alerts (resolved only)
    const { data: ambers } = await supabase
      .from("alerts")
      .select("id, created_at, resolved_at, description, status")
      .eq("user_id", user.id)
      .eq("type", "amber")
      .eq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(100);

    ambers?.forEach((a) =>
      results.push({
        id: a.id,
        type: "amber",
        title: "Amber Alert",
        location: a.description?.slice(0, 60) || undefined,
        started_at: a.created_at || "",
        ended_at: a.resolved_at,
        status: "Resolved",
      })
    );

    // Look After Me sessions (ended)
    const { data: lams } = await supabase
      .from("look_after_me_sessions")
      .select("session_id, started_at, ended_at, place_name, is_active")
      .eq("user_id", user.id)
      .eq("is_active", false)
      .order("started_at", { ascending: false })
      .limit(100);

    lams?.forEach((l) =>
      results.push({
        id: l.session_id,
        type: "lam",
        title: "Look After Me",
        location: l.place_name || undefined,
        started_at: l.started_at || "",
        ended_at: l.ended_at,
        status: "Ended",
      })
    );

    // Incident reports
    const { data: incidents } = await supabase
      .from("incident_reports")
      .select("incident_id, incident_type, description, created_at, status, place_name")
      .eq("reported_by", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    incidents?.forEach((i) =>
      results.push({
        id: i.incident_id,
        type: "incident",
        title: i.incident_type || "Incident",
        location: i.place_name || i.description?.slice(0, 60) || undefined,
        started_at: i.created_at || "",
        status: i.status || "Reported",
      })
    );

    results.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    setItems(results);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">History</h1>
            <p className="text-xs text-muted-foreground">Past alerts and sessions</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted/20 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No past alerts yet</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              Resolved alerts and sessions will appear here.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filtered.map((item) => {
              const config = TYPE_CONFIG[item.type];
              return (
                <motion.div
                  key={`${item.type}-${item.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 p-3 bg-card border border-border rounded-xl"
                >
                  {/* Type dot */}
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full ${config.dotColor} flex-shrink-0`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">
                        {item.status}
                      </span>
                    </div>
                    {item.location && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 inline flex-shrink-0" />
                        {item.location}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(item.started_at), "dd MMM yyyy, HH:mm")}
                      </span>
                      {item.ended_at && (
                        <span>
                          → {format(new Date(item.ended_at), "HH:mm")}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/**
 * Personal Safety Insights Component
 * Private dashboard for the user
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Clock, Calendar, MapPin, Activity, TrendingUp } from "lucide-react";
import { useSafetyInsights } from "@/hooks/useSafetyInsights";

export function SafetyInsightsDashboard() {
  const { summary, loading, generateInsights } = useSafetyInsights();

  useEffect(() => { generateInsights(); }, [generateInsights]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm text-muted-foreground">Analyzing your safety data...</span>
        </div>
      </div>
    );
  }

  if (!summary || summary.totalAlerts === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Safety Insights</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Your personal safety patterns will appear here as you use the app.
        </p>
      </div>
    );
  }

  const insights = [
    {
      icon: Activity,
      label: "Total Alerts",
      value: summary.totalAlerts.toString(),
      color: "text-destructive",
    },
    {
      icon: Clock,
      label: "Most Active Hour",
      value: summary.mostActiveHour !== null
        ? `${summary.mostActiveHour}:00`
        : "N/A",
      color: "text-warning",
    },
    {
      icon: Calendar,
      label: "Riskiest Day",
      value: summary.riskiestDayOfWeek || "N/A",
      color: "text-primary",
    },
    {
      icon: TrendingUp,
      label: "Avg Threat Score",
      value: summary.averageThreatScore.toString(),
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Your Safety Insights</h3>
      </div>

      <p className="text-xs text-muted-foreground">Private — only you can see this</p>

      <div className="grid grid-cols-2 gap-2">
        {insights.map(insight => {
          const Icon = insight.icon;
          return (
            <motion.div
              key={insight.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-secondary/50 rounded-lg p-3"
            >
              <Icon className={`w-4 h-4 ${insight.color} mb-1`} />
              <p className="text-lg font-bold">{insight.value}</p>
              <p className="text-[10px] text-muted-foreground">{insight.label}</p>
            </motion.div>
          );
        })}
      </div>

      {summary.totalCheckIns > 0 && (
        <div className="bg-success/10 rounded-lg p-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-success" />
          <p className="text-xs">
            <span className="font-semibold">{summary.totalCheckIns}</span> check-ins completed
          </p>
        </div>
      )}
    </div>
  );
}

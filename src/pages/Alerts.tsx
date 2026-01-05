import { motion } from "framer-motion";
import { Filter } from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { AlertCard } from "@/components/AlertCard";
import { useAlerts } from "@/hooks/useAlerts";
import { formatDistanceToNow } from "date-fns";

const alertTypes = ["all", "panic", "amber", "robbery", "assault", "suspicious", "accident"];

const Alerts = () => {
  const { alerts, loading } = useAlerts();
  const [selectedType, setSelectedType] = useState("all");

  const filteredAlerts = selectedType === "all" 
    ? alerts 
    : alerts.filter((a) => a.type === selectedType);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Alerts" />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredAlerts.length} alerts
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-sm font-medium"
          >
            <Filter className="w-4 h-4" />
            Filter
          </motion.button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {alertTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                transition-colors capitalize
                ${selectedType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }
              `}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-secondary/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredAlerts.length > 0 ? (
          <div className="space-y-3">
            {filteredAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AlertCard
                  type={alert.type as any}
                  title={`${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} alert ${
                    alert.description ? `- ${alert.description}` : ""
                  }`}
                  location={`${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`}
                  time={formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  isNew={alert.status === "active"}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">No alerts found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedType === "all" 
                ? "Your community is safe! No alerts have been reported."
                : `No ${selectedType} alerts found.`}
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Alerts;

import { motion } from "framer-motion";
import { Filter } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { AlertCard } from "@/components/AlertCard";

const mockAlerts = [
  {
    type: "amber" as const,
    title: "Missing child - 8 year old boy",
    location: "Khomasdal, Windhoek",
    time: "5 min ago",
    distance: "0.8 km",
    isNew: true,
  },
  {
    type: "robbery" as const,
    title: "Armed robbery at petrol station",
    location: "Sam Nujoma Drive",
    time: "15 min ago",
    distance: "2.3 km",
    isNew: true,
  },
  {
    type: "suspicious" as const,
    title: "Suspicious vehicle circling area",
    location: "Independence Ave, Windhoek",
    time: "30 min ago",
    distance: "1.2 km",
  },
  {
    type: "assault" as const,
    title: "Assault reported near bus stop",
    location: "Wernhil Park",
    time: "45 min ago",
    distance: "1.8 km",
  },
  {
    type: "safe" as const,
    title: "Suspect apprehended - Area safe",
    location: "Maerua Mall",
    time: "1 hour ago",
    distance: "2.1 km",
  },
  {
    type: "robbery" as const,
    title: "Vehicle break-in reported",
    location: "Grove Mall parking",
    time: "2 hours ago",
    distance: "3.5 km",
  },
];

const Alerts = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Alerts" />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {mockAlerts.length} alerts nearby
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
          {["All", "Robbery", "Suspicious", "Assault", "Amber"].map((filter, i) => (
            <button
              key={filter}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                transition-colors
                ${i === 0 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }
              `}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {mockAlerts.map((alert, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <AlertCard {...alert} />
            </motion.div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Alerts;

/**
 * Safety Dashboard Page
 * Central hub for safety zones, check-in, insights, and achievements
 */

import { motion } from "framer-motion";
import { Shield, ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SafetyZonesManager } from "@/components/safety/SafetyZonesManager";
import { CheckInWidget } from "@/components/safety/CheckInWidget";
import { AchievementsList } from "@/components/safety/AchievementsList";
import { SafetyInsightsDashboard } from "@/components/safety/SafetyInsightsDashboard";
import { useNavigate } from "react-router-dom";
import { pageVariants } from "@/lib/animations";

const SafetyDashboard = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-background pb-24"
    >
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Safety Center</h1>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Silent Check-In */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <CheckInWidget />
        </motion.div>

        {/* Safety Zones */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <SafetyZonesManager />
        </motion.div>

        {/* Personal Safety Insights */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <SafetyInsightsDashboard />
        </motion.div>

        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <AchievementsList />
        </motion.div>
      </main>

      <BottomNav />
    </motion.div>
  );
};

export default SafetyDashboard;

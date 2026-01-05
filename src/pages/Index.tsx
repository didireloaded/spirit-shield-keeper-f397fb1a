import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { PanicButton } from "@/components/PanicButton";
import { AlertCard } from "@/components/AlertCard";
import { StatusBanner } from "@/components/StatusBanner";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Index = () => {
  const { alerts, loading } = useAlerts();
  const { user } = useAuth();

  const recentAlerts = alerts.slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-lg mx-auto px-4 py-6 space-y-6"
      >
        {/* Status Banner */}
        <motion.div variants={itemVariants}>
          <StatusBanner
            status={alerts.length > 0 && alerts[0].status === "active" ? "warning" : "safe"}
            message={
              alerts.length > 0 && alerts[0].status === "active"
                ? `${alerts.filter((a) => a.status === "active").length} active alerts nearby`
                : "No incidents reported in your area"
            }
          />
        </motion.div>

        {/* Panic & Amber Buttons */}
        <motion.section variants={itemVariants}>
          <p className="text-xs text-muted-foreground text-center mb-4">
            Hold for 1.5 seconds to activate
          </p>
          <div className="flex items-center justify-center gap-8">
            <PanicButton variant="panic" />
            <PanicButton variant="amber" />
          </div>
        </motion.section>

        {/* Recent Alerts */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Alerts
            </h2>
            <a href="/alerts" className="text-sm text-primary font-medium hover:underline">
              View All
            </a>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-secondary/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  type={alert.type as any}
                  title={`${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} alert`}
                  location={`${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`}
                  time={formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  isNew={alert.status === "active"}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">No alerts yet</p>
              <p className="text-xs text-muted-foreground mt-1">Your community is safe!</p>
            </div>
          )}
        </motion.section>

        {/* Emergency Contacts Banner */}
        <motion.section variants={itemVariants}>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <span className="text-xl">🚨</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Namibian Emergency</p>
                <p className="text-xs text-muted-foreground">
                  Police: 10111 | Ambulance: 211111
                </p>
              </div>
              <a
                href="tel:10111"
                className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Call
              </a>
            </div>
          </div>
        </motion.section>
      </motion.main>

      <BottomNav />
    </div>
  );
};

export default Index;

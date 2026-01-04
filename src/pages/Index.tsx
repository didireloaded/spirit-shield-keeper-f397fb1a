import { motion } from "framer-motion";
import {
  MapPin,
  Users,
  Phone,
  Eye,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { PanicButton } from "@/components/PanicButton";
import { QuickAction } from "@/components/QuickAction";
import { AlertCard } from "@/components/AlertCard";
import { StatusBanner } from "@/components/StatusBanner";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Index = () => {
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
            status="safe"
            message="No incidents reported in your area"
          />
        </motion.div>

        {/* Panic Button Section */}
        <motion.section
          variants={itemVariants}
          className="flex flex-col items-center py-6"
        >
          <PanicButton />
        </motion.section>

        {/* Quick Actions Grid */}
        <motion.section variants={itemVariants}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={MapPin}
              label="Report Incident"
              description="Pin location on map"
              variant="warning"
            />
            <QuickAction
              icon={Eye}
              label="Look After Me"
              description="Share trip details"
              variant="safe"
            />
            <QuickAction
              icon={Phone}
              label="Authorities"
              description="Emergency contacts"
              variant="primary"
            />
            <QuickAction
              icon={Users}
              label="Community"
              description="Chat & updates"
              variant="default"
            />
          </div>
        </motion.section>

        {/* Recent Alerts */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Nearby Alerts
            </h2>
            <button className="text-sm text-primary font-medium hover:underline">
              View All
            </button>
          </div>

          <div className="space-y-3">
            <AlertCard
              type="suspicious"
              title="Suspicious vehicle circling area"
              location="Independence Ave, Windhoek"
              time="10 min ago"
              distance="1.2 km"
              isNew
            />
            <AlertCard
              type="robbery"
              title="Armed robbery reported"
              location="Grove Mall, Kleine Kuppe"
              time="35 min ago"
              distance="3.5 km"
            />
            <AlertCard
              type="safe"
              title="Suspect apprehended"
              location="Maerua Mall"
              time="1 hour ago"
              distance="2.1 km"
            />
          </div>
        </motion.section>

        {/* Community Feed Preview */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Community Updates
            </h2>
            <button className="text-sm text-primary font-medium hover:underline">
              See More
            </button>
          </div>

          <motion.div
            whileHover={{ y: -2 }}
            className="guardian-card bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full gradient-guardian flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Neighborhood Watch</span>
                  <span className="text-xs text-muted-foreground">• 2h ago</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Reminder: Keep your car doors locked and valuables out of sight. Stay vigilant! 🛡️
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>24 likes</span>
                  <span>8 comments</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Emergency Contacts Banner */}
        <motion.section variants={itemVariants}>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <AlertTriangle className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Namibian Emergency</p>
                <p className="text-xs text-muted-foreground">
                  Police: 10111 | Ambulance: 211111 | Fire: 2022270
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

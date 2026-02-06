/**
 * Quick Actions Menu
 * Expandable FAB menu for common map actions
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, AlertTriangle, Phone, Share2, Users } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface QuickActionsMenuProps {
  onReportIncident: () => void;
  onEmergencyCall: () => void;
  onShareLocation: () => void;
  onToggleWatchers: () => void;
}

export function QuickActionsMenu({
  onReportIncident,
  onEmergencyCall,
  onShareLocation,
  onToggleWatchers,
}: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: AlertTriangle, label: "Report", onClick: onReportIncident, color: "text-destructive" },
    { icon: Phone, label: "Emergency", onClick: onEmergencyCall, color: "text-destructive" },
    { icon: Share2, label: "Share Location", onClick: onShareLocation, color: "text-primary" },
    { icon: Users, label: "Watchers", onClick: onToggleWatchers, color: "text-primary" },
  ];

  return (
    <div className="fixed bottom-36 right-4 z-30">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 right-0 flex flex-col gap-2.5 items-end"
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  haptics.light();
                  action.onClick();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2.5 bg-background/90 backdrop-blur-md rounded-full pl-4 pr-4 py-2.5 border border-border/50 shadow-lg hover:scale-105 transition-transform"
              >
                <action.icon className={`w-4 h-4 ${action.color}`} />
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          haptics.medium();
          setIsOpen(!isOpen);
        }}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center"
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", damping: 15 }}
        >
          <Plus className="w-5 h-5" />
        </motion.div>
      </motion.button>
    </div>
  );
}

export default QuickActionsMenu;

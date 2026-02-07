/**
 * Quick Dial Panel
 * Emergency quick-dial buttons for authorities screen
 */

import { Phone, Shield, Flame, Heart, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';

export function QuickDialPanel() {
  const emergencyNumbers = [
    { label: "Police", number: "10111", icon: Shield, color: "bg-primary" },
    { label: "Ambulance", number: "911", icon: Stethoscope, color: "bg-success" },
    { label: "Fire", number: "10111", icon: Flame, color: "bg-destructive" },
    { label: "GBV Hotline", number: "116", icon: Heart, color: "bg-purple-600" },
  ];

  return (
    <div className="bg-card rounded-xl p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Phone className="w-5 h-5" />
        Quick Dial Emergency
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {emergencyNumbers.map((emergency, index) => (
          <motion.a
            key={emergency.number + emergency.label}
            href={`tel:${emergency.number}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileTap={{ scale: 0.95 }}
            className={`${emergency.color} text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:opacity-90 transition-opacity`}
          >
            <emergency.icon className="w-6 h-6" />
            <span className="text-xs font-medium">{emergency.label}</span>
            <span className="text-lg font-bold">{emergency.number}</span>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

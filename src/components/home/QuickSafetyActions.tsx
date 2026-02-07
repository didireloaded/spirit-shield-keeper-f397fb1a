/**
 * Quick Safety Actions Widget
 * Quick access buttons for emergency features on the home screen
 */

import { motion } from 'framer-motion';
import { Shield, MapPin, Users, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuickSafetyActions() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: AlertTriangle,
      label: 'Report',
      color: 'bg-destructive/10 text-destructive',
      onClick: () => navigate('/map'),
    },
    {
      icon: MapPin,
      label: 'Live Map',
      color: 'bg-primary/10 text-primary',
      onClick: () => navigate('/map'),
    },
    {
      icon: Users,
      label: 'Watchers',
      color: 'bg-blue-500/10 text-blue-500',
      onClick: () => navigate('/watchers'),
    },
    {
      icon: Shield,
      label: 'Check-In',
      color: 'bg-success/10 text-success',
      onClick: () => navigate('/look-after-me'),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl ${action.color} backdrop-blur-sm transition-transform`}
        >
          <action.icon className="w-5 h-5" />
          <span className="text-xs font-medium">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

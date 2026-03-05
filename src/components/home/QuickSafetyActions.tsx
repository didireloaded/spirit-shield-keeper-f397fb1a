import { motion } from 'framer-motion';
import { MapPin, Users, AlertTriangle, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function QuickSafetyActions() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: AlertTriangle,
      label: 'Report',
      desc: 'Incident',
      iconBg: 'bg-destructive/15',
      iconColor: 'text-destructive',
      onClick: () => navigate('/map'),
    },
    {
      icon: MapPin,
      label: 'Live Map',
      desc: 'View area',
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
      onClick: () => navigate('/map'),
    },
    {
      icon: Users,
      label: 'Watchers',
      desc: 'My circle',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-500',
      onClick: () => navigate('/watchers'),
    },
    {
      icon: Heart,
      label: 'Safety',
      desc: 'Dashboard',
      iconBg: 'bg-success/15',
      iconColor: 'text-success',
      onClick: () => navigate('/safety'),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/40 transition-transform"
        >
          <div className={`w-9 h-9 rounded-xl ${action.iconBg} flex items-center justify-center`}>
            <action.icon className={`w-5 h-5 ${action.iconColor}`} />
          </div>
          <span className="text-xs font-semibold font-display">{action.label}</span>
          <span className="text-[10px] text-muted-foreground leading-none">{action.desc}</span>
        </motion.button>
      ))}
    </div>
  );
}

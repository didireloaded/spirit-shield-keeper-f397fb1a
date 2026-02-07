/**
 * Safety Status Banner
 * Real-time safety status strip showing active alerts in the area
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SafetyStatus {
  level: 'safe' | 'caution' | 'danger';
  activeAlerts: number;
  nearbyIncidents: number;
  message: string;
}

export function SafetyStatusBanner() {
  const [status, setStatus] = useState<SafetyStatus>({
    level: 'safe',
    activeAlerts: 0,
    nearbyIncidents: 0,
    message: '✓ Your area is safe',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchSafetyStatus();

    const channel = supabase
      .channel('safety-status-banner')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'markers',
      }, () => fetchSafetyStatus())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts',
      }, () => fetchSafetyStatus())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const fetchSafetyStatus = async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: markers }, { data: alerts }] = await Promise.all([
      supabase.from('markers').select('id, type').gte('created_at', since).limit(50),
      supabase.from('alerts').select('id, type, status').eq('status', 'active').limit(50),
    ]);

    const nearbyCount = (markers?.length || 0) + (alerts?.length || 0);
    const urgentTypes = ['panic', 'amber', 'assault', 'kidnapping'];
    const urgentCount = (alerts?.filter(a => urgentTypes.includes(a.type)).length || 0) +
      (markers?.filter(m => urgentTypes.includes(m.type)).length || 0);

    let level: SafetyStatus['level'] = 'safe';
    let message = '✓ Your area is safe';

    if (urgentCount > 0) {
      level = 'danger';
      message = `⚠️ ${urgentCount} urgent alert${urgentCount > 1 ? 's' : ''} nearby`;
    } else if (nearbyCount > 3) {
      level = 'caution';
      message = `⚡ ${nearbyCount} incident${nearbyCount > 1 ? 's' : ''} reported today`;
    }

    setStatus({ level, activeAlerts: urgentCount, nearbyIncidents: nearbyCount, message });
  };

  const colorScheme = {
    safe: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', icon: ShieldCheck },
    caution: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', icon: AlertTriangle },
    danger: { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', icon: AlertTriangle },
  };

  const scheme = colorScheme[status.level];
  const Icon = scheme.icon;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate('/map')}
        className={`w-full px-4 py-3 rounded-xl border ${scheme.bg} ${scheme.border} flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-transform`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${scheme.text}`} />
        <div className="flex-1 text-left">
          <p className={`text-sm font-medium ${scheme.text}`}>{status.message}</p>
          {status.nearbyIncidents > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">Tap to view on map</p>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 ${scheme.text}`} />
      </motion.button>
    </AnimatePresence>
  );
}

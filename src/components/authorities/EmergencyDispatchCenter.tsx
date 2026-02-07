/**
 * Emergency Dispatch Center
 * Real-time dashboard showing active panic alerts for authorities
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Navigation, Phone, MapPin,
  Car, CheckCircle, Radio
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { listItemVariants, listContainerVariants } from '@/lib/animations';

interface PanicAlert {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  alert_type: string;
  status: string;
  created_at: string;
  user_profile: {
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
  } | null;
  responders: Array<{
    id: string;
    unit_identifier: string | null;
    status: string;
    eta_minutes: number | null;
  }>;
}

export function EmergencyDispatchCenter() {
  const [activeAlerts, setActiveAlerts] = useState<PanicAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveAlerts();

    const channel = supabase
      .channel('panic-alerts-dispatch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panic_alerts_broadcast' }, () => fetchActiveAlerts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alert_responders' }, () => fetchActiveAlerts())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const fetchActiveAlerts = async () => {
    const { data, error } = await supabase
      .from('panic_alerts_broadcast')
      .select(`
        *,
        user_profile:profiles!user_id (full_name, avatar_url, phone),
        responders:alert_responders (id, unit_identifier, status, eta_minutes)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setActiveAlerts(data.map((d: any) => ({
        ...d,
        user_profile: Array.isArray(d.user_profile) ? d.user_profile[0] ?? null : d.user_profile,
      })));
    }
    setLoading(false);
  };

  const handleDispatchUnit = async (alertId: string) => {
    const { error } = await supabase.from('alert_responders').insert({
      panic_alert_id: alertId,
      responder_type: 'police',
      unit_identifier: `Unit ${Math.floor(Math.random() * 100)}`,
      status: 'dispatched',
      eta_minutes: Math.floor(Math.random() * 15) + 5,
    });

    if (!error) toast.success('Unit dispatched');
    else toast.error('Failed to dispatch');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Alerts Counter */}
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{activeAlerts.length}</p>
              <p className="text-sm text-muted-foreground">Active Emergency Alerts</p>
            </div>
          </div>
          <Radio className="w-6 h-6 text-destructive animate-pulse" />
        </div>
      </div>

      {/* Alert Cards */}
      <motion.div variants={listContainerVariants} initial="initial" animate="animate">
        <AnimatePresence>
          {activeAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              variants={listItemVariants}
              exit={{ opacity: 0, x: 20 }}
              className="bg-card border-2 border-destructive/30 rounded-xl p-4 shadow-lg mb-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-xl">
                    🚨
                  </div>
                  <div>
                    <p className="font-bold">{alert.user_profile?.full_name || 'Unknown User'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-destructive text-destructive-foreground rounded-full text-xs font-bold uppercase animate-pulse">
                  🚨 {alert.alert_type}
                </span>
              </div>

              {/* Location */}
              <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.location_name || 'Unknown Location'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Responders */}
              {alert.responders.length > 0 ? (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Dispatched Units ({alert.responders.length})
                  </p>
                  <div className="space-y-2">
                    {alert.responders.map((responder) => (
                      <div key={responder.id} className="flex items-center justify-between bg-primary/10 rounded-lg p-2">
                        <span className="text-sm font-medium">{responder.unit_identifier || 'Unknown'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            ETA: {responder.eta_minutes} min
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            responder.status === 'en_route'
                              ? 'bg-warning/20 text-warning'
                              : responder.status === 'on_scene'
                              ? 'bg-success/20 text-success'
                              : 'bg-primary/20 text-primary'
                          }`}>
                            {responder.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-warning font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    No units dispatched yet
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                {alert.user_profile?.phone && (
                  <a
                    href={`tel:${alert.user_profile.phone}`}
                    className="flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call User
                  </a>
                )}
                <button
                  onClick={() => handleDispatchUnit(alert.id)}
                  className={`flex items-center justify-center gap-2 py-3 bg-destructive text-destructive-foreground rounded-xl font-medium hover:bg-destructive/90 transition-colors ${
                    !alert.user_profile?.phone ? 'col-span-2' : ''
                  }`}
                >
                  <Car className="w-4 h-4" />
                  Dispatch Unit
                </button>
                <a
                  href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="col-span-2 flex items-center justify-center gap-2 py-3 bg-secondary hover:bg-secondary/80 rounded-xl font-medium transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Open in Maps
                </a>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {activeAlerts.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <p className="text-lg font-semibold">All Clear</p>
          <p className="text-sm text-muted-foreground">No active emergencies at this time</p>
        </div>
      )}
    </div>
  );
}

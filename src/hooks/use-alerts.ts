import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Alert {
  id: string;
  type: string;
  status: string;
  description: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}

export const useAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setAlerts(data as Alert[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  const getStatusBadge = (status: string): { label: string; variant: 'destructive' | 'success' | 'muted' } => {
    switch (status) {
      case 'active':
        return { label: 'Active', variant: 'destructive' };
      case 'resolved':
        return { label: 'Resolved', variant: 'success' };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'muted' };
      default:
        return { label: status, variant: 'muted' };
    }
  };

  return {
    alerts,
    loading,
    getStatusBadge,
    refetch: fetchAlerts,
  };
};

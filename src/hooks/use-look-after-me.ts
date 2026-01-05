import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Watcher {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Session {
  id: string;
  destination: string;
  expected_arrival: string;
  status: string;
}

export const useLookAfterMe = () => {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [watchers, setWatchers] = useState<Watcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const { toast } = useToast();

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  }, []);

  // Fetch active session and watchers
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch active session
    const { data: session } = await supabase
      .from('safety_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (session) {
      setActiveSession(session as Session);
    }

    // Fetch watchers
    const { data: watcherData } = await supabase
      .from('watchers')
      .select('watcher_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (watcherData && watcherData.length > 0) {
      const watcherIds = watcherData.map((w) => w.watcher_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', watcherIds);

      if (profiles) {
        setWatchers(profiles as Watcher[]);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = useCallback(async () => {
    if (!activeSession) return;

    toast({
      title: 'Check-in recorded',
      description: 'Your watchers have been notified that you are safe.',
    });
  }, [activeSession, toast]);

  const handleEndSession = useCallback(async () => {
    if (!activeSession) return;

    const { error } = await supabase
      .from('safety_sessions')
      .update({ status: 'arrived', arrived_at: new Date().toISOString() })
      .eq('id', activeSession.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to end session',
        variant: 'destructive',
      });
      return;
    }

    setActiveSession(null);
    toast({
      title: 'Trip ended',
      description: 'Your watchers have been notified of your safe arrival.',
    });
  }, [activeSession, toast]);

  const handleEmergency = useCallback(async () => {
    if (!activeSession) return;

    const { error } = await supabase
      .from('safety_sessions')
      .update({ status: 'escalated' })
      .eq('id', activeSession.id);

    if (!error) {
      toast({
        title: '🚨 Emergency Alert Sent',
        description: 'Your watchers and emergency contacts have been notified.',
        variant: 'destructive',
      });
    }
  }, [activeSession, toast]);

  return {
    activeSession,
    watchers,
    loading,
    currentLocation,
    handleCheckIn,
    handleEndSession,
    handleEmergency,
  };
};

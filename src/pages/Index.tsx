import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, MapPin, Search, AlertTriangle, Map, Heart, Phone, Users, MessageCircle, Cloud } from 'lucide-react';
import { PanicModal } from '@/components/PanicModal';
import { Navigation } from '@/components/Navigation';
import { NotificationBell } from '@/components/notifications';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { HomeFeed } from '@/components/HomeFeed';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getFirstName, getInitials } from '@/lib/profile-utils';
import { getGreeting } from '@/lib/time-utils';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentAlerts, setRecentAlerts] = useState(0);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [showPanicModal, setShowPanicModal] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData as Profile);
        }
      }

      setLoading(false);
    };

    fetchUserAndProfile();

    // Check location permission
    const checkLocationPermission = async () => {
      if (!navigator.geolocation) {
        setLocationEnabled(false);
        return;
      }

      try {
        if (navigator.permissions?.query) {
          const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          setLocationEnabled(result.state === 'granted');

          result.addEventListener('change', () => {
            setLocationEnabled(result.state === 'granted');
          });
        } else {
          navigator.geolocation.getCurrentPosition(
            () => setLocationEnabled(true),
            () => setLocationEnabled(false),
            { timeout: 1000 }
          );
        }
      } catch (err) {
        console.error('Location permission check failed:', err);
        setLocationEnabled(false);
      }
    };

    checkLocationPermission();
  }, [navigate]);

  useEffect(() => {
    const fetchAlertCount = async () => {
      const { count } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      setRecentAlerts(count || 0);
    };

    fetchAlertCount();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background pb-20">
      {/* Location Banner */}
      <div
        className={`border-b p-3 ${!locationEnabled ? 'cursor-pointer hover:opacity-90' : ''} ${locationEnabled
          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
          : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'
          }`}
        onClick={() => {
          if (!locationEnabled) {
            navigator.geolocation.getCurrentPosition(
              () => {
                setLocationEnabled(true);
                toast({
                  title: 'Location enabled',
                  description: 'You will now receive location-based safety updates',
                });
              },
              () => {
                toast({
                  title: 'Location access denied',
                  description: 'Please enable location in your browser settings',
                  variant: 'destructive',
                });
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }
        }}
        role={!locationEnabled ? 'button' : undefined}
        tabIndex={!locationEnabled ? 0 : undefined}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className={`h-4 w-4 ${locationEnabled ? 'text-green-600' : 'text-orange-600'}`} />
            <span className={`text-sm ${locationEnabled ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'}`}>
              {locationEnabled ? 'Location Enabled' : 'Location Unavailable'}
            </span>
          </div>
          <Cloud className="h-5 w-5 text-yellow-500" />
        </div>
        {!locationEnabled && (
          <p className="text-xs text-orange-700 dark:text-orange-300 text-center mt-1">
            Tap to enable geolocation and get safety updates
          </p>
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-lg mx-auto p-6">
        {/* Greeting */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center cursor-pointer"
            onClick={() => navigate('/profile')}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white text-xl font-bold">
                {getInitials(profile?.full_name)}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {getGreeting()}, {getFirstName(profile?.full_name)}!
            </h1>
            <p className="text-sm text-muted-foreground cursor-pointer" onClick={() => navigate('/profile')}>
              Tap here to edit personal data
            </p>
          </div>
          <NotificationBell className="text-gray-600 dark:text-gray-300" />
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search SafeGuard"
            className="pl-12 h-12 bg-white dark:bg-card rounded-xl border-gray-200 dark:border-border"
            onClick={() => navigate('/alerts')}
          />
        </div>

        {/* Emergency Tools */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Emergency Tools
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Panic Button - Large Featured Card */}
            <div
              className="col-span-2 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition-all relative overflow-hidden"
              onClick={() => setShowPanicModal(true)}
              role="button"
              tabIndex={0}
              aria-label="Emergency SOS Panic Button"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                  <AlertTriangle className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">SOS Panic</h3>
                <p className="text-sm text-white/90">Emergency alert</p>
              </div>
            </div>

            {/* Live Map */}
            <div
              className="bg-white dark:bg-card rounded-3xl p-6 shadow-md cursor-pointer hover:shadow-lg transition-all border border-gray-100 dark:border-border"
              onClick={() => navigate('/map')}
            >
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-2xl flex items-center justify-center mb-3">
                <Map className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Live Map</h3>
              <p className="text-xs text-muted-foreground">View incidents</p>
            </div>

            {/* Look After Me */}
            <div
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-6 shadow-md cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate('/look-after-me')}
            >
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Look After Me</h3>
              <p className="text-xs text-white/90">Trip safety</p>
            </div>

            {/* Emergency Contacts */}
            <div
              className="bg-white dark:bg-card rounded-3xl p-6 shadow-md cursor-pointer hover:shadow-lg transition-all border border-gray-100 dark:border-border"
              onClick={() => navigate('/authorities')}
            >
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950 rounded-2xl flex items-center justify-center mb-3">
                <Phone className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Emergency</h3>
              <p className="text-xs text-muted-foreground">Quick contacts</p>
            </div>

            {/* Community Alerts */}
            <div
              className="bg-white dark:bg-card rounded-3xl p-6 shadow-md cursor-pointer hover:shadow-lg transition-all border border-gray-100 dark:border-border"
              onClick={() => navigate('/alerts')}
            >
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950 rounded-2xl flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Alerts</h3>
              <p className="text-xs text-muted-foreground">{recentAlerts} active</p>
            </div>
          </div>
        </div>

        {/* Community Tools */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Community
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <div
              className="bg-white dark:bg-card rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all border border-gray-100 dark:border-border text-center"
              onClick={() => navigate('/chat')}
            >
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center mx-auto mb-2">
                <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Messages</p>
            </div>

            <div
              className="bg-white dark:bg-card rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all border border-gray-100 dark:border-border text-center"
              onClick={() => navigate('/')}
            >
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Community</p>
            </div>

            <div
              className="bg-white dark:bg-card rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all border border-gray-100 dark:border-border text-center"
              onClick={() => navigate('/profile')}
            >
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xs font-semibold text-gray-900 dark:text-white">Profile</p>
            </div>
          </div>
        </div>

        {/* Home Feed */}
        <HomeFeed />
      </main>

      <Navigation />

      {/* Panic Button Modal */}
      <PanicModal
        isOpen={showPanicModal}
        onClose={() => setShowPanicModal(false)}
        onAlert={() => setRecentAlerts((prev) => prev + 1)}
      />
    </div>
  );
};

export default Index;

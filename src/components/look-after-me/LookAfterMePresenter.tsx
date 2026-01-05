import { motion } from 'framer-motion';
import { Shield, MapPin, Clock, Users, AlertTriangle, CheckCircle, Phone } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

interface LookAfterMePresenterProps {
  activeSession: Session | null;
  watchers: Watcher[];
  loading: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  onCheckIn: () => void;
  onEndSession: () => void;
  onEmergency: () => void;
}

export const LookAfterMePresenter = ({
  activeSession,
  watchers,
  loading,
  currentLocation,
  onCheckIn,
  onEndSession,
  onEmergency,
}: LookAfterMePresenterProps) => {
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="animate-pulse text-primary">Loading...</div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="max-w-lg mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Look After Me</h1>
          <p className="text-muted-foreground">
            Share your journey with trusted contacts
          </p>
        </div>

        {activeSession ? (
          /* Active Session View */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="p-6 border-green-500 bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Trip Active</h3>
                  <p className="text-sm text-muted-foreground">
                    Your watchers are being notified
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{activeSession.destination}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>
                    Expected arrival:{' '}
                    {new Date(activeSession.expected_arrival).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={onCheckIn} className="flex-1" variant="outline">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check In
                </Button>
                <Button
                  onClick={onEndSession}
                  variant="secondary"
                  className="flex-1"
                >
                  End Trip
                </Button>
              </div>
            </Card>

            {/* Emergency Button */}
            <Button
              onClick={onEmergency}
              variant="destructive"
              className="w-full h-14 text-lg"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Emergency
            </Button>
          </motion.div>
        ) : (
          /* No Active Session View */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Your Watchers ({watchers.length})
              </h3>
              {watchers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No watchers added yet. Add trusted contacts to share your
                  journeys.
                </p>
              ) : (
                <div className="space-y-3">
                  {watchers.map((watcher) => (
                    <div
                      key={watcher.id}
                      className="flex items-center gap-3 p-2 bg-muted rounded-lg"
                    >
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                        {watcher.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="font-medium">
                        {watcher.full_name || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Button className="w-full h-14 text-lg" disabled={!currentLocation}>
              <MapPin className="w-5 h-5 mr-2" />
              Start New Trip
            </Button>

            {!currentLocation && (
              <p className="text-xs text-center text-muted-foreground">
                Enable location access to start a trip
              </p>
            )}
          </motion.div>
        )}
      </main>
      <Navigation />
    </div>
  );
};

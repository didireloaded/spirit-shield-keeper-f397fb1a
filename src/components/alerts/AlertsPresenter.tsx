import { motion } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, Shield } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  type: string;
  status: string;
  description: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}

interface StatusBadge {
  label: string;
  variant: 'destructive' | 'success' | 'muted';
}

interface AlertsPresenterProps {
  alerts: Alert[];
  getStatusBadge: (status: string) => StatusBadge;
}

export const AlertsPresenter = ({ alerts, getStatusBadge }: AlertsPresenterProps) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'panic':
        return <Shield className="w-5 h-5 text-destructive" />;
      case 'amber':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'panic':
        return 'border-l-destructive bg-destructive/5';
      case 'amber':
        return 'border-l-warning bg-warning/5';
      default:
        return 'border-l-muted-foreground bg-muted/5';
    }
  };

  const getStatusClasses = (variant: string) => {
    switch (variant) {
      case 'destructive':
        return 'bg-destructive/10 text-destructive';
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="max-w-lg mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Active Alerts</h1>
          <p className="text-muted-foreground">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} in your area
          </p>
        </div>

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">All Clear</h3>
            <p className="text-muted-foreground">No active alerts in your area</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert, index) => {
              const badge = getStatusBadge(alert.status);
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-card rounded-xl p-4 border-l-4 ${getAlertColor(alert.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getAlertIcon(alert.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold capitalize">
                          {alert.type} Alert
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusClasses(badge.variant)}`}>
                          {badge.label}
                        </span>
                      </div>
                      {alert.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {alert.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(alert.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Nearby
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <Navigation />
    </div>
  );
};

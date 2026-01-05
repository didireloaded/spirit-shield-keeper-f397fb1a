import { Navigation } from '@/components/Navigation';
import { useAlerts } from '@/hooks/use-alerts';
import { AlertsPresenter } from '@/components/alerts/AlertsPresenter';

const Alerts = () => {
  const { alerts, getStatusBadge } = useAlerts();

  return (
    <>
      <AlertsPresenter alerts={alerts} getStatusBadge={getStatusBadge} />
    </>
  );
};

export default Alerts;

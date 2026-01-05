import { useAlerts } from '@/hooks/useAlerts';
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

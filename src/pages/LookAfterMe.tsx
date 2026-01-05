import { useLookAfterMe } from '@/hooks/use-look-after-me';
import { LookAfterMePresenter } from '@/components/look-after-me/LookAfterMePresenter';

export const LookAfterMe = () => {
  const { activeSession, watchers, loading, currentLocation, handleCheckIn, handleEndSession, handleEmergency } = useLookAfterMe();
  return <LookAfterMePresenter activeSession={activeSession} watchers={watchers} loading={loading} currentLocation={currentLocation} onCheckIn={handleCheckIn} onEndSession={handleEndSession} onEmergency={handleEmergency} />;
};

export default LookAfterMe;
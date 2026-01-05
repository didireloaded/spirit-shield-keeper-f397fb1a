import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Phone, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PanicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlert?: () => void;
}

export const PanicModal = ({ isOpen, onClose, onAlert }: PanicModalProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [alertSent, setAlertSent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePanic = useCallback(async () => {
    if (isRecording) {
      // Stop recording and send alert
      setIsRecording(false);
      setAlertSent(true);
      toast({
        title: '🚨 Alert Sent',
        description: 'Emergency contacts and authorities have been notified.',
      });
      onAlert?.();
      
      setTimeout(() => {
        setAlertSent(false);
        onClose();
      }, 2000);
      return;
    }

    // Start recording and get location
    setIsRecording(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('alerts').insert({
          user_id: user.id,
          type: 'panic',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          description: 'Panic alert triggered',
          status: 'active',
        });
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }, [isRecording, onAlert, onClose, toast]);

  const handleEmergencyCall = () => {
    window.location.href = 'tel:911';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm mx-4 bg-card rounded-3xl p-6 relative"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {alertSent ? (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Shield className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Alert Sent!</h2>
                <p className="text-muted-foreground">Help is on the way</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
                  <h2 className="text-2xl font-bold mb-2">Emergency SOS</h2>
                  <p className="text-muted-foreground text-sm">
                    {isRecording
                      ? 'Recording audio evidence...'
                      : 'Tap the button to send an emergency alert'}
                  </p>
                </div>

                {/* Panic Button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePanic}
                  className={`w-full py-6 rounded-2xl flex flex-col items-center justify-center transition-all mb-4 ${
                    isRecording
                      ? 'bg-destructive animate-pulse'
                      : 'bg-destructive hover:bg-destructive/90'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Mic className="w-10 h-10 text-white mb-2" />
                      <span className="text-2xl font-mono font-bold text-white">
                        {formatTime(recordingTime)}
                      </span>
                      <span className="text-white/80 text-sm mt-1">Tap to stop & send</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-10 h-10 text-white mb-2" />
                      <span className="text-xl font-bold text-white">SEND ALERT</span>
                    </>
                  )}
                </motion.button>

                {/* Emergency Call Button */}
                <Button
                  variant="outline"
                  onClick={handleEmergencyCall}
                  className="w-full h-14 text-lg gap-3"
                >
                  <Phone className="w-5 h-5" />
                  Call Emergency Services
                </Button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

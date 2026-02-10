/**
 * Notification Permission Onboarding
 * Calm, trust-building multi-step flow
 * No hype. No pressure. Clear value.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Shield, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServiceWorkerPush } from "@/hooks/useServiceWorkerPush";

interface NotificationOnboardingProps {
  onComplete: () => void;
}

type Step = "intro" | "why" | "confirmed" | "denied" | "privacy";

export function NotificationOnboarding({ onComplete }: NotificationOnboardingProps) {
  const [step, setStep] = useState<Step>("intro");
  const { requestPermission, supported } = useServiceWorkerPush();

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    setStep(granted ? "confirmed" : "denied");
  };

  if (!supported) {
    onComplete();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {step === "intro" && (
          <OnboardingCard key="intro">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Bell className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-3">
              Stay informed in real time
            </h2>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-8">
              Notifications help you stay aware of safety updates around you.
              You'll receive alerts for nearby incidents, panic alerts, and community updates you follow.
            </p>
            <p className="text-xs text-muted-foreground text-center mb-6">
              You're always in control of what you receive.
            </p>
            <Button className="w-full" onClick={() => setStep("why")}>
              Continue
            </Button>
            <Button variant="ghost" className="w-full mt-2 text-muted-foreground" onClick={onComplete}>
              Not now
            </Button>
          </OnboardingCard>
        )}

        {step === "why" && (
          <OnboardingCard key="why">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Bell className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-3">
              Why notifications matter
            </h2>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-4">
              Some alerts are time-sensitive. Notifications allow us to let you know when something important happens, even if the app isn't open.
            </p>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-8">
              This includes alerts near your location or updates you've chosen to follow.
            </p>
            <Button className="w-full" onClick={handleRequestPermission}>
              Allow notifications
            </Button>
            <Button variant="ghost" className="w-full mt-2 text-muted-foreground" onClick={onComplete}>
              Decide later
            </Button>
          </OnboardingCard>
        )}

        {step === "confirmed" && (
          <OnboardingCard key="confirmed">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Check className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-3">
              You're all set
            </h2>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-8">
              You'll now receive important updates as they happen.
              You can change what you receive at any time in settings.
            </p>
            <Button className="w-full" onClick={() => setStep("privacy")}>
              Done
            </Button>
          </OnboardingCard>
        )}

        {step === "denied" && (
          <OnboardingCard key="denied">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <X className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-3">
              Notifications are off
            </h2>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-4">
              You won't receive real-time alerts, but you can still view updates inside the app.
            </p>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-8">
              If you change your mind, you can enable notifications anytime in your browser settings.
            </p>
            <Button className="w-full" onClick={onComplete}>
              Continue
            </Button>
          </OnboardingCard>
        )}

        {step === "privacy" && (
          <OnboardingCard key="privacy">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-3">
              Your privacy comes first
            </h2>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-4">
              We don't send notifications to track you. Alerts are based on your preferences and nearby activity, and your location is never shared without your consent.
            </p>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-8">
              Ghost Mode and notification settings are always available.
            </p>
            <Button className="w-full" onClick={onComplete}>
              Continue
            </Button>
          </OnboardingCard>
        )}
      </AnimatePresence>
    </div>
  );
}

function OnboardingCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm bg-card rounded-2xl p-6 shadow-xl border border-border"
    >
      {children}
    </motion.div>
  );
}

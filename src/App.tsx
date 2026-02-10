import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { EmergencyProvider } from "@/contexts/EmergencyContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NetworkStatus } from "@/components/NetworkStatus";
import { ErrorBoundary } from "@/core/providers/ErrorBoundary";
import { NotificationOnboarding } from "@/components/notifications/NotificationOnboarding";
import { AlertReminderPrompt } from "@/components/AlertReminderPrompt";
import { useNotificationOnboarding } from "@/hooks/useNotificationOnboarding";
import { useNotificationDispatcher } from "@/hooks/useNotificationDispatcher";
import { useNotificationNavigation } from "@/hooks/useNotificationNavigation";
import { TIME } from "@/core/config/constants";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Map from "./pages/Map";
import Alerts from "./pages/Alerts";
import LookAfterMe from "./pages/LookAfterMe";
import Authorities from "./pages/Authorities";
import Chat from "./pages/Chat";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import Watchers from "./pages/Watchers";
import NotificationSettings from "./pages/NotificationSettings";
import AmberAlertChat from "./pages/AmberAlertChat";
import SafetyDashboard from "./pages/SafetyDashboard";
import ActivityHistory from "./pages/ActivityHistory";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

// Configure React Query with production-ready defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: TIME.STALE_MEDIUM_MS,
      gcTime: TIME.STALE_LONG_MS,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

function NotificationOnboardingWrapper() {
  const { shouldShow, dismiss } = useNotificationOnboarding();
  if (!shouldShow) return null;
  return <NotificationOnboarding onComplete={dismiss} />;
}

function AnimatedRoutes() {
  const location = useLocation();

  // Central notification dispatcher — listens to ALL streams, applies rules, dispatches
  useNotificationDispatcher();

  // Service worker tap → in-app navigation
  useNotificationNavigation();

  return (
    <>
      <NotificationOnboardingWrapper />
      <AlertReminderPrompt />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><Map /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
          <Route path="/look-after-me" element={<ProtectedRoute><LookAfterMe /></ProtectedRoute>} />
          <Route path="/authorities" element={<ProtectedRoute><Authorities /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/watchers" element={<ProtectedRoute><Watchers /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
          <Route path="/settings/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
          <Route path="/amber-chat/:roomId" element={<ProtectedRoute><AmberAlertChat /></ProtectedRoute>} />
          <Route path="/safety" element={<ProtectedRoute><SafetyDashboard /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><ActivityHistory /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EmergencyProvider>
        <TooltipProvider>
          <NetworkStatus />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
        </TooltipProvider>
      </EmergencyProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

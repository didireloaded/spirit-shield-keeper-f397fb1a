import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Volume2, Vibrate, Moon, Shield, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { settings, loading, updateSettings } = useNotificationSettings();
  const { permission, requestPermission, supported } = usePushNotifications();
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key: string, value: boolean) => {
    setSaving(true);
    const { error } = await updateSettings({ [key]: value });
    setSaving(false);
    
    if (error) {
      toast.error("Failed to update settings");
    } else {
      toast.success("Settings updated");
    }
  };

  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success("Push notifications enabled!");
      await updateSettings({ push_enabled: true });
    } else {
      toast.error("Push notifications were denied. Please enable them in your browser settings.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Notification Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your alert preferences</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Push Notifications Status */}
        {supported && permission !== "granted" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Enable Push Notifications</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Get notified about emergencies even when the app is closed
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={handleEnablePush}
                    >
                      Enable Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* General Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              General
            </CardTitle>
            <CardDescription>Control how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications on your device
                </p>
              </div>
              <Switch
                checked={settings.push_enabled}
                onCheckedChange={(checked) => handleToggle("push_enabled", checked)}
                disabled={saving || permission !== "granted"}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sound & Vibration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Sound & Vibration
            </CardTitle>
            <CardDescription>Customize alert sounds and haptics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Sound Alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Play sounds for notifications
                </p>
              </div>
              <Switch
                checked={settings.sound_enabled}
                onCheckedChange={(checked) => handleToggle("sound_enabled", checked)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Vibrate className="h-3.5 w-3.5 text-muted-foreground" />
                  Vibration
                </Label>
                <p className="text-xs text-muted-foreground">
                  Vibrate for notifications
                </p>
              </div>
              <Switch
                checked={settings.vibration_enabled}
                onCheckedChange={(checked) => handleToggle("vibration_enabled", checked)}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Override */}
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Shield className="h-4 w-4" />
              Emergency Override
            </CardTitle>
            <CardDescription>Critical safety settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Panic Alert Override</Label>
                <p className="text-xs text-muted-foreground">
                  Always notify for panic alerts, even during quiet hours
                </p>
              </div>
              <Switch
                checked={settings.panic_override}
                onCheckedChange={(checked) => handleToggle("panic_override", checked)}
                disabled={saving}
              />
            </div>
            
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs text-muted-foreground">
                <strong className="text-destructive">Important:</strong> We strongly recommend keeping this enabled. 
                Panic alerts are life-critical and should always reach you.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Quiet Hours
            </CardTitle>
            <CardDescription>Mute non-emergency notifications during set times</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Quiet Hours</Label>
                <p className="text-xs text-muted-foreground">
                  {settings.quiet_hours_start} - {settings.quiet_hours_end}
                </p>
              </div>
              <Switch
                checked={settings.quiet_hours_enabled}
                onCheckedChange={(checked) => handleToggle("quiet_hours_enabled", checked)}
                disabled={saving}
              />
            </div>
            
            {settings.quiet_hours_enabled && (
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                During quiet hours, only high-priority alerts (like panic alerts) will notify you 
                if "Panic Alert Override" is enabled.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

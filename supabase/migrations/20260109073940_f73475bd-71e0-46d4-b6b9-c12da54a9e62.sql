-- Create alert_events table for investigation audit trail
CREATE TABLE public.alert_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for fast lookups by alert
CREATE INDEX idx_alert_events_alert_id ON public.alert_events(alert_id);
CREATE INDEX idx_alert_events_created_at ON public.alert_events(created_at);

-- Enable RLS
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;

-- Anyone can view alert events (for community safety)
CREATE POLICY "Alert events are viewable by authenticated users"
ON public.alert_events FOR SELECT
TO authenticated
USING (true);

-- Only the alert owner can insert events
CREATE POLICY "Users can insert events for their own alerts"
ON public.alert_events FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.alerts
    WHERE alerts.id = alert_id
    AND alerts.user_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_events;

-- Add audio metadata columns to alerts table
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS audio_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER;
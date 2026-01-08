-- Create panic_sessions table (core table - everything links here)
CREATE TABLE public.panic_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'interrupted')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  initial_lat DOUBLE PRECISION NOT NULL,
  initial_lng DOUBLE PRECISION NOT NULL,
  last_known_lat DOUBLE PRECISION NOT NULL,
  last_known_lng DOUBLE PRECISION NOT NULL,
  last_location_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  device_info JSONB DEFAULT '{}'::jsonb,
  consent_given BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create panic_audio_chunks table (stores metadata, not audio)
CREATE TABLE public.panic_audio_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panic_session_id UUID NOT NULL REFERENCES public.panic_sessions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  chunk_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER NOT NULL,
  file_size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create panic_location_logs table (movement trail)
CREATE TABLE public.panic_location_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panic_session_id UUID NOT NULL REFERENCES public.panic_sessions(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create panic_alerts table (tracks notifications sent)
CREATE TABLE public.panic_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panic_session_id UUID NOT NULL REFERENCES public.panic_sessions(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('push', 'sms', 'email', 'dashboard', 'watcher')),
  recipient_id UUID,
  recipient_info TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_panic_sessions_user_id ON public.panic_sessions(user_id);
CREATE INDEX idx_panic_sessions_status ON public.panic_sessions(status);
CREATE INDEX idx_panic_audio_chunks_session ON public.panic_audio_chunks(panic_session_id);
CREATE INDEX idx_panic_location_logs_session ON public.panic_location_logs(panic_session_id);
CREATE INDEX idx_panic_alerts_session ON public.panic_alerts(panic_session_id);

-- Enable RLS
ALTER TABLE public.panic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panic_audio_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panic_location_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panic_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for panic_sessions
CREATE POLICY "Users can create their own panic sessions"
  ON public.panic_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own panic sessions"
  ON public.panic_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own panic sessions"
  ON public.panic_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Watchers can view panic sessions they watch"
  ON public.panic_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM watchers 
    WHERE watchers.user_id = panic_sessions.user_id 
    AND watchers.watcher_id = auth.uid() 
    AND watchers.status = 'accepted'
  ));

-- RLS policies for panic_audio_chunks
CREATE POLICY "Users can insert audio chunks for their sessions"
  ON public.panic_audio_chunks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM panic_sessions 
    WHERE panic_sessions.id = panic_session_id 
    AND panic_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can view audio chunks for their sessions"
  ON public.panic_audio_chunks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM panic_sessions 
    WHERE panic_sessions.id = panic_session_id 
    AND (panic_sessions.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM watchers 
      WHERE watchers.user_id = panic_sessions.user_id 
      AND watchers.watcher_id = auth.uid() 
      AND watchers.status = 'accepted'
    ))
  ));

-- RLS policies for panic_location_logs
CREATE POLICY "Users can insert location logs for their sessions"
  ON public.panic_location_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM panic_sessions 
    WHERE panic_sessions.id = panic_session_id 
    AND panic_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can view location logs for their sessions"
  ON public.panic_location_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM panic_sessions 
    WHERE panic_sessions.id = panic_session_id 
    AND (panic_sessions.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM watchers 
      WHERE watchers.user_id = panic_sessions.user_id 
      AND watchers.watcher_id = auth.uid() 
      AND watchers.status = 'accepted'
    ))
  ));

-- RLS policies for panic_alerts
CREATE POLICY "Users can view alerts for their sessions"
  ON public.panic_alerts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM panic_sessions 
    WHERE panic_sessions.id = panic_session_id 
    AND panic_sessions.user_id = auth.uid()
  ) OR recipient_id = auth.uid());

-- Enable realtime for panic_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.panic_sessions;

-- Trigger for updated_at
CREATE TRIGGER update_panic_sessions_updated_at
  BEFORE UPDATE ON public.panic_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
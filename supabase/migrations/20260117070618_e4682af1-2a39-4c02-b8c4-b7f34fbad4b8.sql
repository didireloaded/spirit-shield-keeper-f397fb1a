-- Create API keys table for Open Emergency API
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  permissions JSONB DEFAULT '{"create_sos": true, "update_location": true, "resolve_sos": true}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 60,
  allowed_origins TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create API usage logs table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add threat_score and trigger_source to panic_sessions
ALTER TABLE public.panic_sessions 
ADD COLUMN IF NOT EXISTS threat_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trigger_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- API keys should only be readable by service role (no public access)
CREATE POLICY "API keys are not publicly accessible"
ON public.api_keys
FOR ALL
USING (false);

-- API usage logs should only be readable by service role
CREATE POLICY "API usage logs are not publicly accessible"
ON public.api_usage_logs
FOR ALL
USING (false);

-- Create index for faster API key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key_id ON public.api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created ON public.api_usage_logs(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
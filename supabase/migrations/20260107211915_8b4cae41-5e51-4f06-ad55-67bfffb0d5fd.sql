-- Push notification subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_subscriptions
CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Marker reactions table
CREATE TABLE public.marker_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marker_id uuid NOT NULL REFERENCES public.markers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('verified', 'resolved', 'still_active', 'fake')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(marker_id, user_id)
);

-- Enable RLS
ALTER TABLE public.marker_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for marker_reactions
CREATE POLICY "Anyone can view marker reactions"
ON public.marker_reactions
FOR SELECT
USING (true);

CREATE POLICY "Users can add their own reactions"
ON public.marker_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
ON public.marker_reactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.marker_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Marker comments table
CREATE TABLE public.marker_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marker_id uuid NOT NULL REFERENCES public.markers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marker_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for marker_comments
CREATE POLICY "Anyone can view marker comments"
ON public.marker_comments
FOR SELECT
USING (true);

CREATE POLICY "Users can add comments"
ON public.marker_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.marker_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.marker_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Marker status history table for tracking changes
CREATE TABLE public.marker_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marker_id uuid NOT NULL REFERENCES public.markers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marker_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for marker_status_history
CREATE POLICY "Anyone can view status history"
ON public.marker_status_history
FOR SELECT
USING (true);

CREATE POLICY "Marker owners can add status updates"
ON public.marker_status_history
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.markers WHERE id = marker_id AND user_id = auth.uid())
);

-- Add status column to markers if not exists
ALTER TABLE public.markers ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'verified', 'resolved', 'fake'));

-- Add reaction counts to markers for quick access
ALTER TABLE public.markers ADD COLUMN IF NOT EXISTS verified_count integer DEFAULT 0;
ALTER TABLE public.markers ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0;

-- Create function to update marker reaction counts
CREATE OR REPLACE FUNCTION public.update_marker_verified_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reaction_type = 'verified' THEN
    UPDATE public.markers SET verified_count = verified_count + 1 WHERE id = NEW.marker_id;
  ELSIF TG_OP = 'DELETE' AND OLD.reaction_type = 'verified' THEN
    UPDATE public.markers SET verified_count = verified_count - 1 WHERE id = OLD.marker_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.reaction_type = 'verified' AND NEW.reaction_type != 'verified' THEN
      UPDATE public.markers SET verified_count = verified_count - 1 WHERE id = NEW.marker_id;
    ELSIF OLD.reaction_type != 'verified' AND NEW.reaction_type = 'verified' THEN
      UPDATE public.markers SET verified_count = verified_count + 1 WHERE id = NEW.marker_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for reaction count updates
CREATE TRIGGER update_marker_verified_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.marker_reactions
FOR EACH ROW
EXECUTE FUNCTION public.update_marker_verified_count();

-- Create function to update marker comment counts
CREATE OR REPLACE FUNCTION public.update_marker_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.markers SET comment_count = comment_count + 1 WHERE id = NEW.marker_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.markers SET comment_count = comment_count - 1 WHERE id = OLD.marker_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for comment count updates
CREATE TRIGGER update_marker_comment_count_trigger
AFTER INSERT OR DELETE ON public.marker_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_marker_comment_count();

-- Enable realtime for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.marker_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marker_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marker_status_history;
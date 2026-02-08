
-- Fix search_path for the trigger function
CREATE OR REPLACE FUNCTION public.update_panic_location_from_log()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.panic_sessions
  SET 
    last_known_lat = NEW.lat,
    last_known_lng = NEW.lng,
    current_location_name = NEW.location_name,
    is_moving = NEW.is_moving,
    last_location_at = NEW.recorded_at
  WHERE id = NEW.panic_session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

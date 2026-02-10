-- Enable realtime for tables not yet in the publication
-- Using DO block to handle already-existing members gracefully

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'panic_sessions',
    'panic_location_logs',
    'alerts',
    'markers',
    'safety_sessions',
    'chat_messages',
    'notifications',
    'panic_alerts_broadcast'
  ])
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      RAISE NOTICE 'Added % to supabase_realtime', tbl;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE '% already in supabase_realtime', tbl;
    END;
  END LOOP;
END $$;

-- Fix 1: Drop dangerous notifications INSERT policy (WITH CHECK true)
-- Notifications should only be created by SECURITY DEFINER triggers and edge functions
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Fix 2: Add file type validation to storage upload policies
DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;

CREATE POLICY "Users can upload image files only"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images' 
    AND auth.uid() IS NOT NULL
    AND (storage.extension(name) = ANY(ARRAY['jpg', 'jpeg', 'png', 'gif', 'webp']))
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

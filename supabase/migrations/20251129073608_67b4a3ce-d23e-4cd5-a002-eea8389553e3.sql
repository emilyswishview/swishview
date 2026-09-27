-- Add UPDATE policy for thumbnail_history so users can update their own thumbnails
CREATE POLICY "Users can update their own thumbnails"
  ON public.thumbnail_history
  FOR UPDATE
  USING (auth.uid() = user_id);
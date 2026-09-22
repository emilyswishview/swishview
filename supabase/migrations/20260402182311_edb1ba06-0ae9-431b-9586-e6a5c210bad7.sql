
-- Add attachment_urls column to daily_reports
ALTER TABLE public.daily_reports 
ADD COLUMN IF NOT EXISTS attachment_urls text[] DEFAULT '{}';

-- Storage policies for tracker attachments in assets bucket
CREATE POLICY "Authenticated users can upload tracker attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets' AND (storage.foldername(name))[1] = 'tracker-attachments');

CREATE POLICY "Authenticated users can view tracker attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = 'tracker-attachments');

CREATE POLICY "Users can delete own tracker attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = 'tracker-attachments');

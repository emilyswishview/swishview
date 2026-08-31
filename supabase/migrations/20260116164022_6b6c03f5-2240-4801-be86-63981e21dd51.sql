-- Make the assets bucket public so images can be viewed
UPDATE storage.buckets SET public = true WHERE id = 'assets';

-- Allow admins to upload to assets bucket
CREATE POLICY "Admins can upload to assets bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'assets' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to update files in assets bucket
CREATE POLICY "Admins can update assets bucket"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'assets' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to delete files in assets bucket
CREATE POLICY "Admins can delete from assets bucket"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'assets' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow public read access to assets bucket (for displaying images)
CREATE POLICY "Public can view assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'assets');
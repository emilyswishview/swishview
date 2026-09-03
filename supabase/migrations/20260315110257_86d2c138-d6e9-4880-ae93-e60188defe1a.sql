CREATE POLICY "Allow public uploads to creators folder"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'assets' AND
  (storage.foldername(name))[1] = 'creators'
);

CREATE POLICY "Allow public updates to creators folder"
ON storage.objects FOR UPDATE
TO public
USING (
  bucket_id = 'assets' AND
  (storage.foldername(name))[1] = 'creators'
);
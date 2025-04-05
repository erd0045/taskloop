-- Grant storage permissions for authenticated users
-- For chat_attachments bucket
CREATE POLICY "Authenticated users can upload to chat_attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat_attachments' AND
  auth.role() = 'authenticated'
);

-- For user-content bucket
CREATE POLICY "Authenticated users can upload to user-content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-content' AND
  auth.role() = 'authenticated'
);

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own uploads in chat_attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chat_attachments' AND
  auth.uid() = owner
);

CREATE POLICY "Users can update their own uploads in user-content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-content' AND
  auth.uid() = owner
);

-- Allow users to select (view) uploads
CREATE POLICY "Anyone can view chat_attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat_attachments');

-- Grant delete permissions
CREATE POLICY "Users can delete their own uploads in chat_attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat_attachments' AND
  auth.uid() = owner
);

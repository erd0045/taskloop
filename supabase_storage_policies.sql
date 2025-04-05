-- Make sure attachment columns exist and have proper types
ALTER TABLE public.messages 
  ALTER COLUMN attachment TYPE JSONB USING COALESCE(attachment::JSONB, '{}'::JSONB),
  ALTER COLUMN attachment_name TYPE TEXT,
  ALTER COLUMN attachment_type TYPE TEXT,
  ALTER COLUMN attachment_url TYPE TEXT,
  ALTER COLUMN attachment_size TYPE INTEGER;

-- Add index to improve query performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);

-- Ensure RLS (Row Level Security) is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert messages with attachments
CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert messages" 
  ON public.messages FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow users to select their own messages or messages in chats they participate in
CREATE POLICY IF NOT EXISTS "Allow users to view their chat messages" 
  ON public.messages FOR SELECT 
  TO authenticated 
  USING (
    sender_id = auth.uid() OR 
    chat_id IN (
      SELECT id FROM public.chats 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Ensure storage buckets exist and have proper policies
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('chat_attachments', 'chat_attachments', TRUE, FALSE, 10485760, ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip'])
ON CONFLICT (id) DO UPDATE SET 
  public = TRUE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip'];

-- Create or update storage policies for authenticated users
CREATE POLICY "Allow authenticated users to read chat attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat_attachments');

CREATE POLICY "Allow authenticated users to upload chat attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat_attachments');

CREATE POLICY "Allow authenticated users to update their own chat attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'chat_attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow authenticated users to delete their own chat attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat_attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- First ensure both buckets exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
  ('chat_attachments', 'chat_attachments', TRUE, FALSE, 52428800, ARRAY['image/*', 'application/pdf', 'text/plain', 'application/zip', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('user-content', 'user-content', TRUE, FALSE, 52428800, ARRAY['image/*', 'application/pdf', 'text/plain', 'application/zip', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Clear any existing policies that might be conflicting
DELETE FROM storage.policies 
WHERE bucket_id IN ('chat_attachments', 'user-content');

-- Create policies for chat_attachments bucket
-- Allow ANY authenticated user to insert files into their own folder
CREATE POLICY "Allow authenticated users to upload to chat_attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to select (view) any file in chat_attachments
CREATE POLICY "Allow users to view files in chat_attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat_attachments');

-- Allow public to view files (for public URL access)
CREATE POLICY "Allow public to view files in chat_attachments"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'chat_attachments');

-- Allow users to update only their own files
CREATE POLICY "Allow users to update their own files in chat_attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat_attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete only their own files
CREATE POLICY "Allow users to delete their own files in chat_attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat_attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create identical policies for user-content bucket
CREATE POLICY "Allow authenticated users to upload to user-content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Special policy for the chat_files folder in user-content
CREATE POLICY "Allow authenticated users to upload to chat_files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content' AND
  (storage.foldername(name))[1] = 'chat_files' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to select (view) any file in user-content
CREATE POLICY "Allow users to view files in user-content"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user-content');

-- Allow public to view files (for public URL access)
CREATE POLICY "Allow public to view files in user-content"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'user-content');

-- Allow users to update only their own files
CREATE POLICY "Allow users to update their own files in user-content"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-content' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    (
      (storage.foldername(name))[1] = 'chat_files' AND
      auth.uid()::text = (storage.foldername(name))[2]
    )
  )
);

-- Allow users to delete only their own files
CREATE POLICY "Allow users to delete their own files in user-content"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-content' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    (
      (storage.foldername(name))[1] = 'chat_files' AND
      auth.uid()::text = (storage.foldername(name))[2]
    )
  )
);
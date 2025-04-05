
-- Fix the messages table structure for attachments
ALTER TABLE public.messages 
  ALTER COLUMN attachment TYPE JSONB USING COALESCE(attachment::JSONB, '{}'::JSONB),
  ALTER COLUMN attachment_name TYPE TEXT,
  ALTER COLUMN attachment_type TYPE TEXT,
  ALTER COLUMN attachment_url TYPE TEXT,
  ALTER COLUMN attachment_size TYPE BIGINT;

-- Make sure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);

-- Ensure RLS is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Clear out any potentially conflicting policies
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow users to view their chat messages" ON public.messages;

-- Create proper policies for messages table
CREATE POLICY "Allow authenticated users to insert messages" 
  ON public.messages FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow users to view their chat messages" 
  ON public.messages FOR SELECT 
  TO authenticated 
  USING (
    sender_id = auth.uid() OR 
    chat_id IN (
      SELECT id FROM public.chats 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Ensure storage buckets exist with proper configuration
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
  ('chat_attachments', 'chat_attachments', TRUE, FALSE, 52428800, ARRAY['image/*', 'application/pdf', 'text/plain', 'application/zip', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('user-content', 'user-content', TRUE, FALSE, 52428800, ARRAY['image/*', 'application/pdf', 'text/plain', 'application/zip', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET 
  public = TRUE,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/*', 'application/pdf', 'text/plain', 'application/zip', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Clear out any potentially conflicting storage policies
DELETE FROM storage.policies 
WHERE bucket_id IN ('chat_attachments', 'user-content');

-- Create policies for chat_attachments bucket
CREATE POLICY "Allow authenticated users to upload to chat_attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_attachments'
);

CREATE POLICY "Allow users to view files in chat_attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat_attachments');

CREATE POLICY "Allow public to view files in chat_attachments"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'chat_attachments');

-- Create policies for user-content bucket
CREATE POLICY "Allow authenticated users to upload to user-content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content'
);

CREATE POLICY "Allow users to view files in user-content"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user-content');

CREATE POLICY "Allow public to view files in user-content"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'user-content');

-- Enable realtime for messages if not already enabled
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

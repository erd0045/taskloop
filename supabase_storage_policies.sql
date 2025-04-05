
-- First add the columns if they don't exist
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS attachment JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT;

-- Now alter the columns with proper types
ALTER TABLE public.messages 
  ALTER COLUMN attachment TYPE JSONB USING COALESCE(attachment::JSONB, '{}'::JSONB),
  ALTER COLUMN attachment_name TYPE TEXT,
  ALTER COLUMN attachment_type TYPE TEXT,
  ALTER COLUMN attachment_url TYPE TEXT,
  ALTER COLUMN attachment_size TYPE BIGINT;

-- Make sure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);

-- Ensure RLS (Row Level Security) is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Clear existing policies that might conflict
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow users to view their chat messages" ON public.messages;

-- Allow authenticated users to insert messages with attachments
CREATE POLICY "Allow authenticated users to insert messages" 
  ON public.messages FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow users to select their own messages or messages in chats they participate in
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

-- Ensure storage buckets exist and have proper policies
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
  ('chat_attachments', 'chat_attachments', TRUE, FALSE, 52428800, ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip']),
  ('user-content', 'user-content', TRUE, FALSE, 52428800, ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip'])
ON CONFLICT (id) DO UPDATE SET 
  public = TRUE,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip'];

-- Create policies for chat_attachments bucket
-- Allow ANY authenticated user to insert files
CREATE POLICY "Allow authenticated users to upload to chat_attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat_attachments');

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

-- Create identical policies for user-content bucket
CREATE POLICY "Allow authenticated users to upload to user-content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-content');

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

-- Enable realtime for messages if not already enabled
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

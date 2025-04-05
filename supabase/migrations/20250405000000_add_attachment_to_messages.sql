
-- Add attachment to messages table if it doesn't exist
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment JSONB;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- Enable chat_attachments storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('chat_attachments', 'chat_attachments', TRUE, FALSE, 5242880, ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip'])
ON CONFLICT (id) DO NOTHING;

-- Set up public access to chat_attachments bucket
INSERT INTO storage.policies (name, definition, bucket_id)
VALUES ('Public Read Access', 
  '{"permission":"SELECT","eq":{"bucket_id":"chat_attachments"}}',
  'chat_attachments')
ON CONFLICT (name, bucket_id) DO NOTHING;

-- Allow authenticated users to upload files
INSERT INTO storage.policies (name, definition, bucket_id)
VALUES ('Authenticated Upload Access', 
  '{"permission":"INSERT","eq":{"bucket_id":"chat_attachments"},"auth":{"role":"authenticated"}}',
  'chat_attachments')
ON CONFLICT (name, bucket_id) DO NOTHING;

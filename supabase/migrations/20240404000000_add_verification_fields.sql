
-- Add verification code fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS requestor_verification_code TEXT,
ADD COLUMN IF NOT EXISTS doer_verification_code TEXT,
ADD COLUMN IF NOT EXISTS is_requestor_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_doer_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_requestor_rated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_doer_rated BOOLEAN DEFAULT FALSE;

-- Add rating columns to profiles table if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS requestor_rating DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS doer_rating DECIMAL DEFAULT 0;

-- Add file attachment fields to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_size BIGINT;

-- Create storage bucket for chat attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'chat_attachments', 'chat_attachments', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'chat_attachments');

-- Enable realtime for task_applications
ALTER TABLE public.task_applications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_applications;

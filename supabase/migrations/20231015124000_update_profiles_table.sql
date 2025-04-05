
-- Add rating columns to profiles table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'requestor_rating') THEN
        ALTER TABLE public.profiles ADD COLUMN requestor_rating DECIMAL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'doer_rating') THEN
        ALTER TABLE public.profiles ADD COLUMN doer_rating DECIMAL DEFAULT 0;
    END IF;
END $$;

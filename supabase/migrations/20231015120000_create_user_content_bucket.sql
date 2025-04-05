
-- Create a storage bucket for user content (avatars, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-content', 'user-content', true);

-- Set up security policies so users can access their own content
CREATE POLICY "Anyone can view user content"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-content');

CREATE POLICY "Users can insert their own user content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-content' AND
  (auth.uid() = owner OR owner IS NULL)
);

CREATE POLICY "Users can update their own user content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-content' AND
  auth.uid() = owner
);

CREATE POLICY "Users can delete their own user content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-content' AND
  auth.uid() = owner
);

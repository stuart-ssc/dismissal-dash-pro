-- Add attachments column to help_requests table
ALTER TABLE public.help_requests 
ADD COLUMN attachments text[];

COMMENT ON COLUMN public.help_requests.attachments IS 'Array of storage URLs for uploaded screenshots/images';

-- Create storage bucket for help attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'help-attachments',
  'help-attachments',
  false,
  5242880, -- 5MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
);

-- RLS Policy: Users can upload their own help attachments
CREATE POLICY "Users can upload help attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'help-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can view their own attachments
CREATE POLICY "Users can view own help attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'help-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: System admins can view all help attachments
CREATE POLICY "System admins can view all help attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'help-attachments'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'system_admin'
  )
);
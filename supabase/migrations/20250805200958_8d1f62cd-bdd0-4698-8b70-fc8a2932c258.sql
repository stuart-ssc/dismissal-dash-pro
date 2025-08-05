-- Add new columns to schools table
ALTER TABLE public.schools 
ADD COLUMN address TEXT,
ADD COLUMN phone_number TEXT,
ADD COLUMN primary_color TEXT DEFAULT '#3B82F6',
ADD COLUMN secondary_color TEXT DEFAULT '#EF4444';

-- Create storage bucket for school logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('school-logos', 'school-logos', true);

-- Create storage policies for school logos
CREATE POLICY "School logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'school-logos');

CREATE POLICY "School admins can upload school logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'school-logos' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE p.id = auth.uid() 
    AND ur.role = 'school_admin'
  )
);

CREATE POLICY "School admins can update school logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'school-logos' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE p.id = auth.uid() 
    AND ur.role = 'school_admin'
  )
);

CREATE POLICY "School admins can delete school logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'school-logos' 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE p.id = auth.uid() 
    AND ur.role = 'school_admin'
  )
);
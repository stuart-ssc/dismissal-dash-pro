-- Add invitation tracking to teachers table
ALTER TABLE public.teachers 
ADD COLUMN invitation_status text DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'completed', 'expired')),
ADD COLUMN invitation_token text,
ADD COLUMN invitation_sent_at timestamp with time zone,
ADD COLUMN invitation_expires_at timestamp with time zone,
ADD COLUMN account_completed_at timestamp with time zone;
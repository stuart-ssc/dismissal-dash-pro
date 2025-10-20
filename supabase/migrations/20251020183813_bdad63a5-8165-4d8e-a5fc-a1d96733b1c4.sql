-- Add rate limiting columns to email_change_requests table
ALTER TABLE public.email_change_requests 
ADD COLUMN IF NOT EXISTS verification_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_verification_attempt_at timestamp with time zone;

-- Add index for performance on verification queries
CREATE INDEX IF NOT EXISTS idx_email_change_requests_verification_token 
ON public.email_change_requests(verification_token) 
WHERE status = 'pending';

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_email_change_requests_verification_attempts 
ON public.email_change_requests(last_verification_attempt_at) 
WHERE verification_attempts >= 5;

-- Comment on new columns
COMMENT ON COLUMN public.email_change_requests.verification_attempts IS 'Number of failed verification attempts for rate limiting';
COMMENT ON COLUMN public.email_change_requests.last_verification_attempt_at IS 'Timestamp of last verification attempt for rate limiting';
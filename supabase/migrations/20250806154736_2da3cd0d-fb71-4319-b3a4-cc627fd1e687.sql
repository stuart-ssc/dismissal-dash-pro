-- Add dismissal settings columns
ALTER TABLE public.schools 
ADD COLUMN dismissal_time TIME,
ADD COLUMN preparation_time_minutes INTEGER DEFAULT 5,
ADD COLUMN auto_dismissal_enabled BOOLEAN DEFAULT false,
ADD COLUMN walkers_enabled BOOLEAN DEFAULT true,
ADD COLUMN car_lines_enabled BOOLEAN DEFAULT true;

-- Add notification settings columns
ALTER TABLE public.schools
ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN parent_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN emergency_alerts_enabled BOOLEAN DEFAULT true;

-- Add security settings columns
ALTER TABLE public.schools
ADD COLUMN two_factor_required BOOLEAN DEFAULT false,
ADD COLUMN session_timeout_enabled BOOLEAN DEFAULT false,
ADD COLUMN audit_logs_enabled BOOLEAN DEFAULT true;
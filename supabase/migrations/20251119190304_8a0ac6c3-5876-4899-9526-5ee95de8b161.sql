-- Create districts table
CREATE TABLE public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_name text NOT NULL,
  street_address text,
  city text,
  state text,
  zipcode text,
  phone_number text,
  email text,
  website text,
  timezone text DEFAULT 'America/New_York',
  allow_school_timezone_override boolean DEFAULT true,
  allow_school_dismissal_time_override boolean DEFAULT true,
  allow_school_colors_override boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

-- Add district_id to schools
ALTER TABLE public.schools 
ADD COLUMN district_id uuid REFERENCES public.districts(id);

CREATE INDEX idx_schools_district_id ON public.schools(district_id);

-- Create user_districts
CREATE TABLE public.user_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  district_id uuid REFERENCES public.districts(id) ON DELETE CASCADE NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, district_id)
);

ALTER TABLE public.user_districts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_districts_user_id ON public.user_districts(user_id);
CREATE INDEX idx_user_districts_district_id ON public.user_districts(district_id);

-- Create verification requests
CREATE TABLE public.district_admin_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  district_name text NOT NULL,
  role_title text,
  phone_number text,
  verification_token text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  rejection_reason text
);

ALTER TABLE public.district_admin_verification_requests ENABLE ROW LEVEL SECURITY;

-- Add IC connection tracking
ALTER TABLE public.infinite_campus_connections
ADD COLUMN configured_by uuid REFERENCES auth.users(id),
ADD COLUMN configured_by_role text CHECK (configured_by_role IN ('school_admin', 'district_admin'));

-- Populate districts
INSERT INTO public.districts (district_name, state, created_at)
SELECT DISTINCT school_district, state, now()
FROM public.schools
WHERE school_district IS NOT NULL AND school_district != ''
ON CONFLICT DO NOTHING;

-- Assign schools to districts
UPDATE public.schools s
SET district_id = d.id
FROM public.districts d
WHERE s.school_district = d.district_name
  AND s.school_district IS NOT NULL AND s.school_district != '';

-- Security functions
CREATE OR REPLACE FUNCTION public.has_district_admin_role(user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT has_role(user_id, 'district_admin'::app_role); $$;

CREATE OR REPLACE FUNCTION public.get_user_district_id(user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT district_id FROM public.user_districts WHERE user_districts.user_id = user_id AND is_primary = true LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.can_view_district_data(target_district_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT has_role(auth.uid(), 'system_admin'::app_role) OR EXISTS (SELECT 1 FROM user_districts WHERE user_id = auth.uid() AND district_id = target_district_id); $$;

CREATE OR REPLACE FUNCTION public.can_manage_district_data(target_district_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT has_role(auth.uid(), 'system_admin'::app_role) OR (has_district_admin_role(auth.uid()) AND EXISTS (SELECT 1 FROM user_districts WHERE user_id = auth.uid() AND district_id = target_district_id)); $$;

CREATE OR REPLACE FUNCTION public.get_district_school_ids()
RETURNS bigint[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT ARRAY(SELECT id FROM schools WHERE district_id = get_user_district_id(auth.uid())); $$;

-- RLS for districts
CREATE POLICY "District admins view" ON public.districts FOR SELECT TO authenticated USING (can_view_district_data(id));
CREATE POLICY "District admins update" ON public.districts FOR UPDATE TO authenticated USING (can_manage_district_data(id)) WITH CHECK (can_manage_district_data(id));
CREATE POLICY "System admins all" ON public.districts FOR ALL TO authenticated USING (has_role(auth.uid(), 'system_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

-- RLS for user_districts
CREATE POLICY "View assignments" ON public.user_districts FOR SELECT TO authenticated USING (user_id = auth.uid() OR can_view_district_data(district_id));
CREATE POLICY "Manage assignments" ON public.user_districts FOR ALL TO authenticated USING (can_manage_district_data(district_id)) WITH CHECK (can_manage_district_data(district_id));
CREATE POLICY "System admin assignments" ON public.user_districts FOR ALL TO authenticated USING (has_role(auth.uid(), 'system_admin'::app_role));

-- RLS for verification
CREATE POLICY "System admins view verifications" ON public.district_admin_verification_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'system_admin'::app_role));
CREATE POLICY "System admins manage verifications" ON public.district_admin_verification_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'system_admin'::app_role));

-- District admin access to school data
CREATE POLICY "District admins students" ON public.students FOR SELECT TO authenticated USING (has_district_admin_role(auth.uid()) AND school_id = ANY(get_district_school_ids()));
CREATE POLICY "District admins teachers" ON public.teachers FOR SELECT TO authenticated USING (has_district_admin_role(auth.uid()) AND school_id = ANY(get_district_school_ids()));
CREATE POLICY "District admins classes" ON public.classes FOR SELECT TO authenticated USING (has_district_admin_role(auth.uid()) AND school_id = ANY(get_district_school_ids()));
CREATE POLICY "District admins runs" ON public.dismissal_runs FOR SELECT TO authenticated USING (has_district_admin_role(auth.uid()) AND school_id = ANY(get_district_school_ids()));
CREATE POLICY "District admins buses" ON public.buses FOR SELECT TO authenticated USING (has_district_admin_role(auth.uid()) AND school_id = ANY(get_district_school_ids()));
CREATE POLICY "District admins car lines" ON public.car_lines FOR SELECT TO authenticated USING (has_district_admin_role(auth.uid()) AND school_id = ANY(get_district_school_ids()));
CREATE POLICY "District admins walkers" ON public.walker_locations FOR SELECT TO authenticated USING (has_district_admin_role(auth.uid()) AND school_id = ANY(get_district_school_ids()));
CREATE POLICY "District admins IC view" ON public.infinite_campus_connections FOR SELECT TO authenticated USING (has_district_admin_role(auth.uid()) AND school_id = ANY(get_district_school_ids()));
CREATE POLICY "District admins IC manage" ON public.infinite_campus_connections FOR ALL TO authenticated USING (has_district_admin_role(auth.uid()) AND school_id = ANY(get_district_school_ids())) WITH CHECK (has_district_admin_role(auth.uid()) AND school_id = ANY(get_district_school_ids()));
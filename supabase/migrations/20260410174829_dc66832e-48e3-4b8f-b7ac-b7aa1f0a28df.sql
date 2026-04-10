
-- Create ic_district_connections table
CREATE TABLE public.ic_district_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  base_url TEXT NOT NULL,
  app_name TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  token_url TEXT NOT NULL,
  oneroster_version TEXT NOT NULL DEFAULT '1.2',
  status TEXT NOT NULL DEFAULT 'active',
  configured_by UUID REFERENCES auth.users(id),
  configured_by_role TEXT,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(district_id)
);

-- Create ic_school_mappings table
CREATE TABLE public.ic_school_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  district_connection_id UUID NOT NULL REFERENCES public.ic_district_connections(id) ON DELETE CASCADE,
  school_id BIGINT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  ic_school_sourced_id TEXT NOT NULL,
  ic_school_name TEXT NOT NULL,
  mapped_by UUID REFERENCES auth.users(id),
  mapped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id)
);

-- Enable RLS
ALTER TABLE public.ic_district_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ic_school_mappings ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_ic_district_connections_district_id ON public.ic_district_connections(district_id);
CREATE INDEX idx_ic_school_mappings_district_connection_id ON public.ic_school_mappings(district_connection_id);
CREATE INDEX idx_ic_school_mappings_school_id ON public.ic_school_mappings(school_id);

-- Updated_at triggers
CREATE TRIGGER update_ic_district_connections_updated_at
  BEFORE UPDATE ON public.ic_district_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ic_school_mappings_updated_at
  BEFORE UPDATE ON public.ic_school_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for ic_district_connections

-- System admins: full access
CREATE POLICY "System admins can manage all IC district connections"
  ON public.ic_district_connections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role));

-- District admins: manage their own district
CREATE POLICY "District admins can manage their district IC connection"
  ON public.ic_district_connections FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'district_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.user_districts ud
      WHERE ud.user_id = auth.uid() AND ud.district_id = ic_district_connections.district_id
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'district_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.user_districts ud
      WHERE ud.user_id = auth.uid() AND ud.district_id = ic_district_connections.district_id
    )
  );

-- School admins: view their district's connection
CREATE POLICY "School admins can view their district IC connection"
  ON public.ic_district_connections FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'school_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.user_schools us
      JOIN public.schools s ON s.id = us.school_id
      WHERE us.user_id = auth.uid() AND s.district_id = ic_district_connections.district_id
    )
  );

-- RLS Policies for ic_school_mappings

-- System admins: full access
CREATE POLICY "System admins can manage all IC school mappings"
  ON public.ic_school_mappings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role));

-- District admins: manage mappings in their district
CREATE POLICY "District admins can manage their district school mappings"
  ON public.ic_school_mappings FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'district_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.ic_district_connections idc
      JOIN public.user_districts ud ON ud.district_id = idc.district_id
      WHERE idc.id = ic_school_mappings.district_connection_id AND ud.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'district_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.ic_district_connections idc
      JOIN public.user_districts ud ON ud.district_id = idc.district_id
      WHERE idc.id = ic_school_mappings.district_connection_id AND ud.user_id = auth.uid()
    )
  );

-- School admins: view all mappings in their district, manage their own school's mapping
CREATE POLICY "School admins can view their district school mappings"
  ON public.ic_school_mappings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'school_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.ic_district_connections idc
      JOIN public.schools s ON s.district_id = idc.district_id
      JOIN public.user_schools us ON us.school_id = s.id
      WHERE idc.id = ic_school_mappings.district_connection_id AND us.user_id = auth.uid()
    )
  );

CREATE POLICY "School admins can create their own school mapping"
  ON public.ic_school_mappings FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'school_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.user_schools us
      WHERE us.user_id = auth.uid() AND us.school_id = ic_school_mappings.school_id
    )
  );

CREATE POLICY "School admins can update their own school mapping"
  ON public.ic_school_mappings FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'school_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.user_schools us
      WHERE us.user_id = auth.uid() AND us.school_id = ic_school_mappings.school_id
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'school_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.user_schools us
      WHERE us.user_id = auth.uid() AND us.school_id = ic_school_mappings.school_id
    )
  );

-- Add RLS policies for district admins to manage schools in their district

-- District admins can insert schools into their assigned district
CREATE POLICY "District admins can create schools in their district"
  ON schools FOR INSERT
  TO authenticated
  WITH CHECK (
    has_district_admin_role(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM user_districts 
      WHERE user_id = auth.uid() 
      AND district_id = schools.district_id
    )
  );

-- District admins can update schools in their district
CREATE POLICY "District admins can update schools in their district"
  ON schools FOR UPDATE
  TO authenticated
  USING (
    has_district_admin_role(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM user_districts 
      WHERE user_id = auth.uid() 
      AND district_id = schools.district_id
    )
  )
  WITH CHECK (
    has_district_admin_role(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM user_districts 
      WHERE user_id = auth.uid() 
      AND district_id = schools.district_id
    )
  );

COMMENT ON POLICY "District admins can create schools in their district" ON schools IS 'Allows district admins to create new schools within their assigned district';
COMMENT ON POLICY "District admins can update schools in their district" ON schools IS 'Allows district admins to update schools within their assigned district';
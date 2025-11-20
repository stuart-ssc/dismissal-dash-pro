-- Add RLS policy for district admins to view each other
CREATE POLICY "District admins can view district admin profiles in same district"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- User is a district admin
  has_district_admin_role(auth.uid())
  AND
  -- Target profile is a district admin (has no school_id)
  school_id IS NULL
  AND
  -- Target profile belongs to same district
  EXISTS (
    SELECT 1 
    FROM user_districts ud1
    INNER JOIN user_districts ud2 ON ud1.district_id = ud2.district_id
    WHERE ud1.user_id = auth.uid()  -- Current user's district
    AND ud2.user_id = profiles.id    -- Target profile's district
  )
);
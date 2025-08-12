-- Fix existing car assignments for students who were imported with "car rider" transportation
-- but weren't assigned because of the transportation type mismatch

-- First, let's assign all students with NULL transportation assignments to car lines
-- if they have no existing transportation assignments and there's a car line available
INSERT INTO student_car_assignments (student_id, car_line_id, assigned_at)
SELECT DISTINCT 
    s.id as student_id,
    cl.id as car_line_id,
    now() as assigned_at
FROM students s
CROSS JOIN car_lines cl
WHERE s.school_id = cl.school_id
  AND NOT EXISTS (
    SELECT 1 FROM student_bus_assignments sba WHERE sba.student_id = s.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM student_walker_assignments swa WHERE swa.student_id = s.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM student_car_assignments sca WHERE sca.student_id = s.id
  )
  -- Only assign if there's exactly one car line to avoid ambiguity
  AND (
    SELECT COUNT(*) 
    FROM car_lines cl2 
    WHERE cl2.school_id = s.school_id 
    AND cl2.status = 'active'
  ) = 1;
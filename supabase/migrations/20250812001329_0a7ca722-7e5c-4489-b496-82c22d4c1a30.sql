-- Clean up imported records for school_id = 2 while preserving existing transportation resources

-- First, let's delete student assignments (these would have been created during import)
DELETE FROM student_bus_assignments 
WHERE student_id IN (SELECT id FROM students WHERE school_id = 2);

DELETE FROM student_car_assignments 
WHERE student_id IN (SELECT id FROM students WHERE school_id = 2);

DELETE FROM student_walker_assignments 
WHERE student_id IN (SELECT id FROM students WHERE school_id = 2);

-- Delete class rosters
DELETE FROM class_rosters 
WHERE student_id IN (SELECT id FROM students WHERE school_id = 2);

-- Delete class teacher assignments
DELETE FROM class_teachers 
WHERE class_id IN (SELECT id FROM classes WHERE school_id = 2);

-- Delete students (imported during roster import)
DELETE FROM students WHERE school_id = 2;

-- Delete teachers (imported during roster import)  
DELETE FROM teachers WHERE school_id = 2;

-- Delete classes (imported during roster import)
DELETE FROM classes WHERE school_id = 2;

-- Note: We're NOT deleting buses, car_lines, or walker_locations as these were your test records created before import
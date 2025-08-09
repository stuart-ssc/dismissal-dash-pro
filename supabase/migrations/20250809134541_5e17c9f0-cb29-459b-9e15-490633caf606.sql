-- Add foreign key constraints for student_walker_assignments
ALTER TABLE public.student_walker_assignments 
ADD CONSTRAINT fk_student_walker_student 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.student_walker_assignments 
ADD CONSTRAINT fk_student_walker_location 
FOREIGN KEY (walker_location_id) REFERENCES public.walker_locations(id) ON DELETE CASCADE;

-- Add foreign key constraints for student_car_assignments  
ALTER TABLE public.student_car_assignments 
ADD CONSTRAINT fk_student_car_student 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.student_car_assignments 
ADD CONSTRAINT fk_student_car_line 
FOREIGN KEY (car_line_id) REFERENCES public.car_lines(id) ON DELETE CASCADE;
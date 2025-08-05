-- Add missing foreign key constraints
ALTER TABLE public.student_bus_assignments 
ADD CONSTRAINT student_bus_assignments_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.student_bus_assignments 
ADD CONSTRAINT student_bus_assignments_bus_id_fkey 
FOREIGN KEY (bus_id) REFERENCES public.buses(id) ON DELETE CASCADE;
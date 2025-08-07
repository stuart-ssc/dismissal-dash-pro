-- Add foreign key constraints to dismissal_group_car_lines table
ALTER TABLE public.dismissal_group_car_lines 
ADD CONSTRAINT fk_dismissal_group_car_lines_group 
FOREIGN KEY (dismissal_group_id) REFERENCES public.dismissal_groups(id) ON DELETE CASCADE;

ALTER TABLE public.dismissal_group_car_lines 
ADD CONSTRAINT fk_dismissal_group_car_lines_car_line 
FOREIGN KEY (car_line_id) REFERENCES public.car_lines(id) ON DELETE CASCADE;
-- Remove older duplicate bus by ID and insert a new test bus for school_id 2
DELETE FROM public.buses
WHERE id = '6e80cf92-e97e-4069-8684-94bd231052ee';

INSERT INTO public.buses (bus_number, driver_first_name, driver_last_name, status, school_id)
VALUES ('5678', 'Jordan', 'Avery', 'active', 2);
-- Fix the profiles table to have proper UUID default for ID column
ALTER TABLE public.profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();
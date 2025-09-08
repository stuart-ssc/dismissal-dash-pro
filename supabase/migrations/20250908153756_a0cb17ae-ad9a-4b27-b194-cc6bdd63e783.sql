-- Fix security definer view warning by dropping it and using function instead
-- The view with SECURITY DEFINER is flagged as a security risk

-- Drop the problematic view
DROP VIEW IF EXISTS public.students_teacher_view;

-- Update the existing function to be the primary way teachers access student data
-- This function already properly masks sensitive data and is more secure
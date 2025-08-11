-- Add updated_at column to schools and set up automatic updates
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure the timestamp auto-updates on row changes using existing function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.schools'::regclass
      AND tgname = 'update_schools_updated_at'
  ) THEN
    CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

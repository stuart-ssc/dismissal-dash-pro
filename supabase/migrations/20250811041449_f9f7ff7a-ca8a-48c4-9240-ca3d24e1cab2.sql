-- Add separate address fields to schools table
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zipcode text;

-- Optional: keep existing 'address' column for backward compatibility (no change)

-- Note: RLS policies remain unchanged as we are only adding columns.
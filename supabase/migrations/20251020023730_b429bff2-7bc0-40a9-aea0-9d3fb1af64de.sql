-- Delete Indiana schools with data quality issues
-- These have ZIP codes in the state field and 'IN' in the city field
-- Total affected: 1,917 schools
DELETE FROM public.schools
WHERE 
  LENGTH(state) = 5 
  AND state ~ '^[0-9]{5}$'
  AND city = 'IN';
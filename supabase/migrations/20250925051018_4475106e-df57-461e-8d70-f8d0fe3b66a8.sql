-- Create or replace a dedicated server-side school search for signup
CREATE OR REPLACE FUNCTION public.search_schools_for_signup(q text)
RETURNS TABLE(id bigint, school_name text, city text, state text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH params AS (
    SELECT lower(regexp_replace(coalesce(q, ''), '[^a-z0-9\s]', ' ', 'g')) AS qclean
  ),
  tokens AS (
    SELECT regexp_split_to_array((SELECT qclean FROM params), '\\s+') AS parts
  ),
  sig AS (
    SELECT 
      array_remove(array_agg(p), NULL) AS arr,
      (SELECT qclean FROM params) AS qnorm
    FROM (
      SELECT NULLIF(p, '') AS p
      FROM unnest((SELECT parts FROM tokens)) AS p
    ) t
    WHERE length(p) >= 2
      AND p NOT IN ('school','elementary','middle','high','academy','the','of','and','for','public','charter','magnet')
  )
  SELECT s.id, s.school_name, s.city, s.state
  FROM public.schools s, sig
  WHERE s.school_name IS NOT NULL
    AND (
      (length(sig.qnorm) >= 2 AND lower(s.school_name) LIKE sig.qnorm || '%')
      OR (
        cardinality(sig.arr) > 0 AND NOT EXISTS (
          SELECT 1 FROM unnest(sig.arr) w
          WHERE NOT (
            lower(s.school_name) LIKE '%' || w || '%'
            OR lower(s.city) LIKE '%' || w || '%'
            OR lower(s.state) LIKE '%' || w || '%'
          )
        )
      )
    )
  ORDER BY
    (lower(s.school_name) LIKE sig.qnorm || '%') DESC,
    strpos(lower(s.school_name), sig.qnorm),
    s.school_name
  LIMIT 50;
$$;
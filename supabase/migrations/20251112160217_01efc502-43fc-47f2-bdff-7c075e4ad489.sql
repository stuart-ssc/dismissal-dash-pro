-- Phase 1: Add period/schedule columns to classes table
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS period_number integer,
ADD COLUMN IF NOT EXISTS period_start_time time without time zone,
ADD COLUMN IF NOT EXISTS period_end_time time without time zone,
ADD COLUMN IF NOT EXISTS period_name text;

COMMENT ON COLUMN public.classes.period_number IS 'The period number in the school day (e.g., 1, 2, 3)';
COMMENT ON COLUMN public.classes.period_start_time IS 'Start time of this class period';
COMMENT ON COLUMN public.classes.period_end_time IS 'End time of this class period';
COMMENT ON COLUMN public.classes.period_name IS 'User-friendly period name (e.g., "1st Period", "Homeroom")';

-- Add dismissal period tracking to dismissal_runs table
ALTER TABLE public.dismissal_runs
ADD COLUMN IF NOT EXISTS dismissal_period integer,
ADD COLUMN IF NOT EXISTS dismissal_period_name text;

COMMENT ON COLUMN public.dismissal_runs.dismissal_period IS 'Which period to dismiss from (for mid-day dismissals/field trips)';
COMMENT ON COLUMN public.dismissal_runs.dismissal_period_name IS 'User-friendly label for the dismissal period';

-- Phase 2: Backfill academic_session_id for South Northern Middle School

-- Find the school_id for South Northern Middle School
DO $$
DECLARE
  v_school_id bigint;
  v_session_id uuid;
  v_classes_updated integer;
  v_rosters_updated integer;
BEGIN
  -- Get the school_id for South Northern Middle School
  SELECT id INTO v_school_id
  FROM public.schools
  WHERE school_name ILIKE '%South Northern Middle School%'
  LIMIT 1;

  IF v_school_id IS NULL THEN
    RAISE NOTICE 'South Northern Middle School not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found South Northern Middle School with ID: %', v_school_id;

  -- Get the active academic session for this school
  SELECT id INTO v_session_id
  FROM public.academic_sessions
  WHERE school_id = v_school_id
    AND is_active = true
  ORDER BY start_date DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE NOTICE 'No active academic session found for school_id: %', v_school_id;
    RETURN;
  END IF;

  RAISE NOTICE 'Found active academic session with ID: %', v_session_id;

  -- Update classes table
  UPDATE public.classes
  SET academic_session_id = v_session_id
  WHERE school_id = v_school_id
    AND academic_session_id IS NULL;

  GET DIAGNOSTICS v_classes_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % classes with academic_session_id', v_classes_updated;

  -- Update class_rosters table
  UPDATE public.class_rosters cr
  SET academic_session_id = v_session_id
  FROM public.classes c
  WHERE cr.class_id = c.id
    AND c.school_id = v_school_id
    AND cr.academic_session_id IS NULL;

  GET DIAGNOSTICS v_rosters_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % class roster entries with academic_session_id', v_rosters_updated;

  RAISE NOTICE 'Backfill complete: % classes, % roster entries updated', v_classes_updated, v_rosters_updated;
END $$;
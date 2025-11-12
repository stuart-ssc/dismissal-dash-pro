-- Backfill academic_session_id for South Northern Middle School
-- This ensures all existing students, classes, dismissal runs, and plans are properly linked to the current academic session

DO $$
DECLARE
  v_school_id bigint;
  v_session_id uuid;
  v_students_updated integer := 0;
  v_classes_updated integer := 0;
  v_runs_updated integer := 0;
  v_plans_updated integer := 0;
BEGIN
  -- Find South Northern Middle School
  SELECT id INTO v_school_id
  FROM schools
  WHERE school_name ILIKE '%South Northern Middle School%'
  LIMIT 1;

  IF v_school_id IS NULL THEN
    RAISE NOTICE 'South Northern Middle School not found, skipping backfill';
    RETURN;
  END IF;

  RAISE NOTICE 'Found South Northern Middle School with ID: %', v_school_id;

  -- Get or create the current academic session (2025-2026)
  SELECT id INTO v_session_id
  FROM academic_sessions
  WHERE school_id = v_school_id
    AND session_name = '2025-2026'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    -- Create the 2025-2026 academic session if it doesn't exist
    INSERT INTO academic_sessions (
      school_id,
      session_name,
      session_code,
      start_date,
      end_date,
      is_active,
      session_type
    ) VALUES (
      v_school_id,
      '2025-2026',
      '2025-2026',
      '2025-08-01',
      '2026-06-30',
      true,
      'schoolYear'
    )
    RETURNING id INTO v_session_id;
    
    RAISE NOTICE 'Created academic session 2025-2026 with ID: %', v_session_id;
  ELSE
    RAISE NOTICE 'Found existing academic session 2025-2026 with ID: %', v_session_id;
  END IF;

  -- Backfill students
  UPDATE students
  SET academic_session_id = v_session_id
  WHERE school_id = v_school_id
    AND academic_session_id IS NULL;
  
  GET DIAGNOSTICS v_students_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % students with academic_session_id', v_students_updated;

  -- Backfill classes
  UPDATE classes
  SET academic_session_id = v_session_id
  WHERE school_id = v_school_id
    AND academic_session_id IS NULL;
  
  GET DIAGNOSTICS v_classes_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % classes with academic_session_id', v_classes_updated;

  -- Backfill dismissal runs
  UPDATE dismissal_runs
  SET academic_session_id = v_session_id
  WHERE school_id = v_school_id
    AND academic_session_id IS NULL
    AND date >= '2025-08-01'  -- Only backfill runs from the 2025-2026 school year
    AND date <= '2026-06-30';
  
  GET DIAGNOSTICS v_runs_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % dismissal runs with academic_session_id', v_runs_updated;

  -- Backfill dismissal plans
  UPDATE dismissal_plans
  SET academic_session_id = v_session_id
  WHERE school_id = v_school_id
    AND academic_session_id IS NULL;
  
  GET DIAGNOSTICS v_plans_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % dismissal plans with academic_session_id', v_plans_updated;

  -- Update class_rosters to match the session of their associated classes
  WITH roster_updates AS (
    SELECT cr.id, c.academic_session_id
    FROM class_rosters cr
    JOIN classes c ON c.id = cr.class_id
    WHERE c.school_id = v_school_id
      AND cr.academic_session_id IS NULL
      AND c.academic_session_id IS NOT NULL
  )
  UPDATE class_rosters cr
  SET academic_session_id = ru.academic_session_id
  FROM roster_updates ru
  WHERE cr.id = ru.id;

  RAISE NOTICE 'Backfill complete for South Northern Middle School';
  RAISE NOTICE 'Summary: % students, % classes, % runs, % plans updated', 
    v_students_updated, v_classes_updated, v_runs_updated, v_plans_updated;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error during backfill: %', SQLERRM;
    RAISE;
END $$;

-- Make assigned_by nullable so backfill can set it to NULL
ALTER TABLE public.special_use_group_managers
  ALTER COLUMN assigned_by DROP NOT NULL;

-- Backfill group managers from source classes
WITH matched_pairs AS (
  SELECT DISTINCT sug.id AS group_id, c.id AS source_class_id
  FROM special_use_groups sug
  JOIN classes c 
    ON c.school_id = sug.school_id 
    AND c.academic_session_id = sug.academic_session_id
    AND c.is_hidden = true
  WHERE 
    NOT EXISTS (
      SELECT 1 FROM special_use_group_managers m WHERE m.group_id = sug.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM special_use_group_students sugs
      WHERE sugs.group_id = sug.id
      AND NOT EXISTS (
        SELECT 1 FROM class_rosters cr 
        WHERE cr.class_id = c.id AND cr.student_id = sugs.student_id
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM class_rosters cr
      WHERE cr.class_id = c.id
      AND NOT EXISTS (
        SELECT 1 FROM special_use_group_students sugs 
        WHERE sugs.group_id = sug.id AND sugs.student_id = cr.student_id
      )
    )
    AND EXISTS (SELECT 1 FROM special_use_group_students sugs WHERE sugs.group_id = sug.id)
    AND EXISTS (SELECT 1 FROM class_rosters cr WHERE cr.class_id = c.id)
),
inserted AS (
  INSERT INTO special_use_group_managers (group_id, manager_id, assigned_by)
  SELECT mp.group_id, ct.teacher_id, NULL
  FROM matched_pairs mp
  JOIN class_teachers ct ON ct.class_id = mp.source_class_id
  ON CONFLICT DO NOTHING
  RETURNING group_id, manager_id
)
INSERT INTO audit_logs (table_name, action, details)
SELECT 
  'special_use_group_managers',
  'BACKFILL_GROUP_MANAGERS',
  jsonb_build_object(
    'groups_updated', (SELECT COUNT(DISTINCT group_id) FROM inserted),
    'managers_inserted', (SELECT COUNT(*) FROM inserted)
  )
WHERE EXISTS (SELECT 1 FROM inserted);

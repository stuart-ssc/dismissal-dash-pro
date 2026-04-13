

# Fix: `added_by` NOT NULL violation in convert_classes_to_groups RPC

## Problem
The `special_use_group_students` table requires `added_by` (NOT NULL), but the `convert_classes_to_groups` RPC inserts students without setting it.

## Fix
Update the RPC's INSERT into `special_use_group_students` to include `added_by = auth.uid()`:

```sql
INSERT INTO special_use_group_students (group_id, student_id, added_by)
SELECT v_new_group_id, cr.student_id, auth.uid()
FROM class_rosters cr
WHERE cr.class_id = v_class_id
ON CONFLICT DO NOTHING;
```

## File
- **New migration**: Update `convert_classes_to_groups` function with the fix above (single line change in the INSERT statement).


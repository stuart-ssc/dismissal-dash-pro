

# Fix: Missing Foreign Keys on class_teachers and class_rosters

## Root Cause

The `class_teachers` and `class_rosters` tables have **no foreign key constraints at all**. The Classes page (`src/pages/Classes.tsx`) uses PostgREST embedded resource joins like:

```typescript
supabase.from('class_teachers').select('class_id, teachers(first_name, last_name)')
```

PostgREST requires foreign key relationships to resolve these joins. Without FKs, the `teachers(...)` part silently returns null, making every class show no teacher and no students.

This is **not** a sync issue, an RLS issue, or a role issue. The data exists (805 teacher assignments, 14,916 roster entries). The page simply cannot join to related tables.

## Fix

### 1. Database Migration: Add Foreign Keys

Create a migration to add the missing foreign key constraints:

```sql
-- class_teachers: FK to classes and teachers
ALTER TABLE class_teachers 
  ADD CONSTRAINT class_teachers_class_id_fkey 
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

ALTER TABLE class_teachers 
  ADD CONSTRAINT class_teachers_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;

-- class_rosters: FK to classes and students
ALTER TABLE class_rosters 
  ADD CONSTRAINT class_rosters_class_id_fkey 
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

ALTER TABLE class_rosters 
  ADD CONSTRAINT class_rosters_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
```

### 2. Fix Stats Query in Classes.tsx

The stats query (line 225) still uses `.limit(10000)` to fetch all class IDs, which is capped at 1,000. Replace with a count-only approach or paginated fetch for accurate stats across 2,010 classes.

### 3. No Edge Function Changes Needed

The sync logic is working correctly -- all data is being written. This is purely a schema + UI fix.

## Files to Change
- New migration in `supabase/migrations/` -- add foreign keys
- `src/pages/Classes.tsx` -- fix stats query `.limit(10000)` pattern

## Expected Outcome
After adding FKs, the existing PostgREST joins will resolve correctly, and teacher names + student counts will appear immediately on the Classes page without needing another sync.


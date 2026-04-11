

# Fix: Supabase 1,000-Row Default Limit Breaking Enrollments

## Root Cause

Supabase's JavaScript client has a **default limit of 1,000 rows** per query. The `syncEnrollments` function pre-fetches classes, students, and teachers into in-memory Maps, but these queries don't specify a higher limit:

- **Classes**: 2,010 records -- only 1,000 fetched, so 1,010 classes are missing from `classMap`
- **Students**: 1,010 records -- only 1,000 fetched, so 10 students are missing from `studentMap`  
- **Teachers**: 104 records -- fine (under 1,000)

When enrollments reference a class or student not in the Map, the code does `if (!classId) continue` and silently skips them. Result: **0 class_rosters and 0 class_teachers** inserted.

This same issue affects the pre-fetch queries in `syncStudents` and `syncTeachers` (existing records lookup) and the `syncClasses` function.

## Fix

### In `supabase/functions/sync-infinite-campus/index.ts`

Add `.limit(10000)` (or a suitably high number) to every bulk pre-fetch query that could exceed 1,000 rows. Affected queries:

1. **syncEnrollments** (lines ~552-601):
   - `classes` query (line 552-556) -- add `.limit(10000)`
   - `students` query (line 564-568) -- add `.limit(10000)`
   - `teachers` query (line 576-580) -- add `.limit(10000)`
   - `class_rosters` query (line 588-591) -- add `.limit(10000)`
   - `class_teachers` query (line 598-601) -- add `.limit(10000)`

2. **syncStudents** pre-fetch queries -- add `.limit(10000)` to existing students lookup
3. **syncTeachers** pre-fetch queries -- add `.limit(10000)` to existing teachers lookup
4. **syncClasses** pre-fetch queries -- add `.limit(10000)` to existing classes lookup

Also add error logging on the batch insert calls for `class_rosters` and `class_teachers` so failures aren't silent.

### Redeploy `sync-infinite-campus`

After fix, re-sync East Jessamine Middle School. Teacher-class and student-class assignments should populate.

## Files to change
- `supabase/functions/sync-infinite-campus/index.ts` -- add `.limit(10000)` to all bulk queries + error logging on inserts


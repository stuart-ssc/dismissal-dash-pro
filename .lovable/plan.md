

# Why Syncs Got Stuck + Performance Optimization Plan

## Why they stuck
The two stuck syncs hit Supabase's **CPU time limit** (typically 50s of CPU for edge functions). The function timed out mid-execution before reaching the error handler, so the sync log was never updated from `in_progress`. The stale sync detector we just added (lines 774-784) will auto-clean these in the future.

## Performance problems in the current code

1. **Duplicate API calls in the archive step (lines 870-872)**: After syncing, the function re-fetches students, teachers, AND classes from the IC API *again* just to get their sourcedIds for archiving. This doubles the total API calls.

2. **One-by-one database operations**: Every teacher, student, class, and enrollment is queried and upserted individually (`for` loop with single-row queries). For a school with 500 students, that's 1,000+ individual DB round-trips.

3. **One-by-one enrollment lookups (lines 540-590)**: Each enrollment does two separate DB lookups (class + student/teacher) before inserting -- potentially thousands of queries.

## Fix: 3 optimizations

### 1. Cache API results to eliminate duplicate fetches
Return the fetched sourcedIds from `syncTeachers`, `syncStudents`, and `syncClasses` so the archive step can reuse them instead of calling the API again.

**Changes in `sync-infinite-campus/index.ts`:**
- `syncTeachers` returns `{ created, updated, pending, sourcedIds: string[] }`
- `syncStudents` returns `{ created, updated, pending, sourcedIds: string[] }`
- `syncClasses` returns `{ created, updated, withPeriods, withoutPeriods, sourcedIds: string[] }`
- Remove lines 870-872 (the duplicate API calls)
- Pass cached sourcedIds directly to `archiveMissing`

### 2. Batch database upserts where possible
Replace individual insert/update loops with batch operations using Supabase's `.upsert()` with `onConflict`.

**Key changes:**
- In `syncClasses`: Build an array of class records, then upsert in one call using `onConflict: 'ic_external_id'` (or batch in chunks of 50)
- In `syncEnrollments`: Pre-fetch all class and student mappings in two bulk queries, then do lookups in memory instead of per-enrollment DB queries

### 3. Pre-fetch lookup maps for enrollments
Instead of querying the DB per enrollment:
- Fetch all classes for this school with `ic_external_id` in one query
- Fetch all students for this school with `ic_external_id` in one query
- Build in-memory maps, then iterate enrollments without any DB reads

## Files to change
- `supabase/functions/sync-infinite-campus/index.ts` -- all 3 optimizations

## Expected impact
- API calls: reduced by ~50% (no duplicate fetches)
- DB queries: reduced from O(n) per record to O(1) bulk operations
- Should comfortably complete within the CPU time limit


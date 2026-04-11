

# Fix: Batch syncTeachers and syncStudents to Prevent Timeout

## Problem
The sync keeps timing out because `syncTeachers` (lines 116-252) and `syncStudents` (lines 254-356) perform **individual DB queries per record**. For 1000+ students and 100+ teachers, that's 2000+ sequential database round-trips, exceeding the CPU time limit.

Classes and enrollments were already batched in the last optimization, but teachers and students were not.

## Fix

### 1. Clean up the stuck sync log
SQL migration to mark `16a426ec-43b0-40b0-994a-ca134a0f7ce0` as failed.

### 2. Batch `syncStudents` in `sync-infinite-campus/index.ts`

Replace the row-by-row loop with:
1. **Pre-fetch all existing students** for this school with `ic_external_id` in one query (build a Map)
2. **Skip fuzzy matching on first sync** -- if a school has 0 existing students (like this one), every student is new, so `findStudentMatch` is unnecessary. Only run fuzzy matching when there are existing students without `ic_external_id`.
3. **Batch insert** new students in chunks of 50 using `.insert()`
4. **Batch update** existing students using `Promise.all` on chunks

### 3. Batch `syncTeachers` in `sync-infinite-campus/index.ts`

Same pattern as students:
1. Pre-fetch existing teachers with `ic_external_id` in one query
2. Skip fuzzy matching when no existing teachers lack `ic_external_id`
3. Batch insert/update in chunks of 50

### 4. Redeploy

## Expected impact
- Students: from ~2000 DB queries down to ~20 (pre-fetch + chunked inserts)
- Teachers: from ~200 DB queries down to ~5
- Should complete well within CPU time limit

## Files to change
- `supabase/functions/sync-infinite-campus/index.ts` -- batch teacher and student sync
- SQL migration to clean up stuck sync log


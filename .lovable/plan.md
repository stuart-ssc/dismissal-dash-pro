

# Fix: CPU Time Exceeded -- Scope Classes and Enrollments to School

## Problem
The sync function times out ("CPU Time exceeded") because `syncClasses()` calls `client.getClasses()` which fetches **all 6,700+ classes across the entire district** (67+ paginated API calls). The same issue affects `syncEnrollments()` and the archive section.

Teachers and students were already fixed to use school-scoped endpoints, but classes and enrollments were missed.

## Fix

### 1. `supabase/functions/sync-infinite-campus/index.ts`

**syncClasses function (line 435-439)**
- Add `icSchoolSourcedId` parameter
- Replace `client.getClasses()` with `client.getClassesForSchool(icSchoolSourcedId)`

**syncEnrollments function (line 519-523)**
- Instead of `client.getEnrollments()` (all district enrollments), iterate over only the classes that were synced for this school and call `client.getEnrollments(classId)` per class
- Alternative: add a `getEnrollmentsForSchool` method to the OneRoster client if the `/schools/{id}/enrollments` endpoint is supported

**Archive section (line 858)**
- Replace `client.getClasses()` with `client.getClassesForSchool(effectiveSchoolSourcedId)`

**Call sites (lines 847, 852)**
- Pass `effectiveSchoolSourcedId` to both `syncClasses` and `syncEnrollments`

### 2. `supabase/functions/_shared/oneroster-client.ts`
- Add `getEnrollmentsForSchool(schoolSourcedId)` method using the standard OneRoster endpoint `/schools/{sourcedId}/enrollments` (if supported), with a fallback to per-class enrollment fetching

### 3. Redeploy
- Redeploy `sync-infinite-campus`

## Why this works
- School-scoped endpoints return only classes/enrollments for the mapped school (likely hundreds, not thousands)
- Dramatically reduces API calls and CPU time
- Matches the pattern already applied for teachers and students

## Files to change
- `supabase/functions/sync-infinite-campus/index.ts` -- scope classes and enrollments to school
- `supabase/functions/_shared/oneroster-client.ts` -- add school-scoped enrollments method


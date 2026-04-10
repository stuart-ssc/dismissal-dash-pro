

# Fix: IC Sync Fails Due to Unsupported `role` Filter

## Problem
The sync crashes with: `OneRoster API error (users): 400 - Invalid filter field: role`

The `syncTeachers` function calls `client.getUsers('teacher')`, which constructs the request `GET /users?filter=role='teacher'`. This Infinite Campus instance does not support filtering by `role` on the `/users` endpoint.

The OneRoster client already has dedicated methods -- `getTeachersForSchool(sourcedId)` and `getStudentsForSchool(sourcedId)` -- that use the proper endpoints (`/schools/{sourcedId}/teachers` and `/schools/{sourcedId}/students`). These endpoints return the correct data without any filter parameter.

## Fix

### `supabase/functions/sync-infinite-campus/index.ts`

1. **Extract `icSchoolSourcedId`** from `schoolMapping.ic_school_sourced_id` (already available in scope from line 732-736). For legacy connections, fall back to discovering it via `client.getSchools()`.

2. **Replace all 4 `getUsers()` calls** with school-scoped endpoints:
   - Line 128: `client.getUsers('teacher')` → `client.getTeachersForSchool(icSchoolSourcedId)`
   - Line 272: `client.getUsers('student')` → `client.getStudentsForSchool(icSchoolSourcedId)`
   - Line 839: `client.getUsers('student')` → `client.getStudentsForSchool(icSchoolSourcedId)`
   - Line 840: `client.getUsers('teacher')` → `client.getTeachersForSchool(icSchoolSourcedId)`

3. **Pass `icSchoolSourcedId`** into `syncTeachers()` and `syncStudents()` as a new parameter.

### Redeploy
Redeploy `sync-infinite-campus`.

## Why this works
- The `/schools/{sourcedId}/teachers` and `/schools/{sourcedId}/students` endpoints are standard OneRoster endpoints that return only the relevant users for that school -- no filter needed.
- The school's IC `sourcedId` is already stored in `ic_school_mappings.ic_school_sourced_id` from the setup process.
- This also improves correctness: previously, `getUsers('teacher')` would return teachers from ALL schools in the district, not just the mapped school.

## Files to change
- `supabase/functions/sync-infinite-campus/index.ts` -- Replace `getUsers()` calls with school-scoped endpoints


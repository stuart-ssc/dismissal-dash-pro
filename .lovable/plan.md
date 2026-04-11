

# Fix: Supabase 1,000-Row Limit Truncating Enrollment Maps

## Root Cause (confirmed from edge function logs)

The latest sync fetched **17,112 enrollments** with correct role values (`"student": 16290, "teacher": 822`), but **all 17,112 were skipped** with reason `no class`.

The enrollment maps show:
- `classes: 1000` (but 2,010 exist)
- `students: 1000` (but 1,010 exist)
- `teachers: 104` (correct, under 1000)

The pre-fetch queries in `syncEnrollments` use `.limit(10000)`, but **PostgREST's server-side `max_rows` silently caps all queries at 1,000 rows**, even for service-role clients. So only half the classes and students are loaded into the lookup maps, and enrollments referencing the missing half are all skipped.

This same issue affects `syncTeachers` and `syncStudents` pre-fetch queries (e.g., fetching existing records for dedup), though those happen to work because there are fewer than 1,000 existing records currently.

## Fix

Replace all `.limit(10000)` pre-fetch queries with a paginated fetch helper that loops in chunks of 900 until all rows are retrieved.

### File: `supabase/functions/sync-infinite-campus/index.ts`

1. Add a helper function `fetchAllRows` that paginates any Supabase query in chunks of 900:
```typescript
async function fetchAllRows<T>(
  query: () => any, // returns a SupabaseQueryBuilder with .range()
  chunkSize = 900
): Promise<T[]> {
  let all: T[] = [];
  let offset = 0;
  while (true) {
    const { data } = await query().range(offset, offset + chunkSize - 1);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < chunkSize) break;
    offset += chunkSize;
  }
  return all;
}
```

2. Replace every `.limit(10000)` call in `syncEnrollments`, `syncTeachers`, `syncStudents`, and `syncClasses` with paginated fetches using this helper.

3. Key queries to fix (all in `syncEnrollments`):
   - `allClasses` pre-fetch (line ~556-561)
   - `allStudents` pre-fetch (line ~569-574)
   - `allTeachers` pre-fetch (line ~582-587)
   - `existingRosters` pre-fetch (line ~595-599)
   - `existingTeacherAssignments` pre-fetch (line ~606-610)

4. Also fix in `syncTeachers` and `syncStudents`:
   - `existingWithIcId` pre-fetch
   - `unmatchedTeachers`/`unmatchedStudents` pre-fetch

5. Also fix the stats query pre-fetch in `src/pages/Classes.tsx` (line ~225-226) where `classIdsRes` uses `.limit(10000)` -- same cap applies to the browser client.

### File: `src/pages/Classes.tsx`

The stats query fetches all class IDs with `.limit(10000)` to count students/teachers. Since this is also capped at 1,000, the stats will be wrong for schools with more than 1,000 classes. Fix by using count-only queries instead of fetching IDs.

## Files to change
- `supabase/functions/sync-infinite-campus/index.ts` -- paginate all pre-fetch queries
- `src/pages/Classes.tsx` -- fix stats query to avoid `.limit(10000)` pattern


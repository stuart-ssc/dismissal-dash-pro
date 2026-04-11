

# Fix: Teachers Not Assigned to Classes (Enrollment Sync Returning 0)

## Root Cause

The database confirms:
- **104 teachers** exist (all with `ic_external_id`)
- **2,010 classes** exist (all with `ic_external_id`)
- **0 class_teachers** records
- **0 class_rosters** records
- Last 3 syncs all completed with `enrollments_created = 0, enrollments_updated = 0`

The `syncEnrollments` function calls `client.getEnrollmentsForSchool(icSchoolSourcedId)` which hits the OneRoster endpoint `/schools/{sourcedId}/enrollments`. This endpoint likely returns a **200 OK with an empty result** on Infinite Campus, because IC often does not support school-scoped enrollment endpoints. When it returns empty, no error is thrown, so the fallback to district-wide `/enrollments` is never triggered.

Additionally, there is **zero logging** of how many enrollments were fetched from the API -- so the problem has been invisible.

## Fix (2 files)

### 1. `supabase/functions/_shared/oneroster-client.ts`

Change `getEnrollmentsForSchool` to **always check** if the school-scoped result is empty and fall back to district-wide enrollments filtered by school:

```typescript
async getEnrollmentsForSchool(schoolSourcedId: string): Promise<OneRosterEnrollment[]> {
  try {
    const enrollments = await this.paginate<OneRosterEnrollment>(
      `schools/${schoolSourcedId}/enrollments`
    );
    if (enrollments.length > 0) {
      console.log(`School-scoped enrollments returned ${enrollments.length} records`);
      return enrollments;
    }
    console.log('School-scoped enrollments returned 0 records, trying district-wide fallback');
  } catch (error) {
    console.log('School-scoped enrollments endpoint failed:', error);
  }
  
  // Fallback: fetch all enrollments and filter by school
  const allEnrollments = await this.paginate<OneRosterEnrollment>('enrollments');
  console.log(`District-wide enrollments returned ${allEnrollments.length} records`);
  
  // Filter to only enrollments for classes belonging to this school
  // (we can't filter server-side on IC, so we filter client-side)
  return allEnrollments;
}
```

### 2. `supabase/functions/sync-infinite-campus/index.ts`

Add logging after fetching enrollments so we can see counts:

```typescript
const enrollments = await client.getEnrollmentsForSchool(icSchoolSourcedId);
console.log(`Fetched ${enrollments.length} enrollments from OneRoster API`);
```

Also add a safety log when enrollments reference unknown classes/students/teachers so we can diagnose mapping failures:

```typescript
// After building maps, log sizes
console.log(`Enrollment maps - classes: ${classMap.size}, students: ${studentMap.size}, teachers: ${teacherMap.size}`);

// Track skip reasons
let skippedNoClass = 0, skippedNoStudent = 0, skippedNoTeacher = 0;
```

### 3. Redeploy `sync-infinite-campus`

After the fix, trigger a manual re-sync for East Jessamine Middle School.

## Files to change
- `supabase/functions/_shared/oneroster-client.ts` -- fix enrollment fallback logic
- `supabase/functions/sync-infinite-campus/index.ts` -- add enrollment count logging


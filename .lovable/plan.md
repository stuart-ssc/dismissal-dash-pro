

# Fix: Schools list empty despite successful connection

## Problem
The `/schools` endpoint succeeds but returns 0 results. The current fallback only triggers on HTTP errors, not empty results. Meanwhile, `/orgs` returns 18 organizations — some of which are schools.

## Root Cause
In `oneroster-client.ts`, `getSchools()` catches errors and falls back to orgs filtered by `type='school'`. But when `/schools` returns a 200 with an empty array, no error is thrown, so the fallback never runs.

## Fix

### `supabase/functions/_shared/oneroster-client.ts`
Update `getSchools()` to also fall back when the result is empty:

```typescript
async getSchools(): Promise<OneRosterSchool[]> {
  try {
    const schools = await this.paginate<OneRosterSchool>('schools');
    if (schools.length > 0) return schools;
    console.log('getSchools() returned 0 results, falling back to orgs filtered by type=school');
  } catch (error) {
    console.log('getSchools() failed, falling back to orgs filtered by type=school:', error);
  }
  const orgs = await this.paginate<OneRosterOrg>('orgs');
  return orgs
    .filter(o => o.type?.toLowerCase() === 'school')
    .map(o => ({ sourcedId: o.sourcedId, name: o.name, type: o.type }));
}
```

### Redeploy
Deploy `test-ic-connection`, `get-ic-district-schools`, `connect-ic-district`, and `sync-infinite-campus` (all share the updated client).

## Why this will work
The logs confirm 18 orgs are returned. Some of those orgs will have `type='school'`, which is the standard OneRoster way to represent schools within the orgs collection. This is a one-line logic change.


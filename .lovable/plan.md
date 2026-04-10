

# Fix: IC orgs not matching `type='school'` filter

## Problem
The `/schools` endpoint returns 0 results. The fallback fetches 18 orgs but filters strictly for `type === 'school'`, which matches none of them. We don't know what `type` values IC is returning because they're not logged.

## Fix (2 changes)

### 1. `oneroster-client.ts` -- Log org types and broaden filter
In `getSchools()`:
- Log each org's `name` and `type` so we can see what IC returns
- Accept additional OneRoster `OrgType` values that represent schools: `school`, `local`, and any org that is NOT `district`, `national`, `state`

```typescript
async getSchools(): Promise<OneRosterSchool[]> {
  try {
    const schools = await this.paginate<OneRosterSchool>('schools');
    if (schools.length > 0) return schools;
    console.log('getSchools() returned 0, falling back to orgs');
  } catch (error) {
    console.log('getSchools() failed, falling back to orgs:', error);
  }
  const orgs = await this.paginate<OneRosterOrg>('orgs');
  console.log('Org types found:', orgs.map(o => `${o.name}: ${o.type}`));
  
  // Accept 'school' or 'local' (common IC type for schools)
  const schoolTypes = ['school', 'local'];
  let filtered = orgs.filter(o => schoolTypes.includes(o.type?.toLowerCase()));
  
  // If still empty, return all orgs that aren't district/national/state
  if (filtered.length === 0) {
    const excludeTypes = ['district', 'national', 'state'];
    filtered = orgs.filter(o => !excludeTypes.includes(o.type?.toLowerCase()));
  }
  
  // Last resort: return ALL orgs so the user can pick
  if (filtered.length === 0) {
    filtered = orgs;
  }
  
  return filtered.map(o => ({
    sourcedId: o.sourcedId, name: o.name, type: o.type
  }));
}
```

### 2. Redeploy
Deploy `test-ic-connection`, `get-ic-district-schools`, `connect-ic-district`, and `sync-infinite-campus`.

## Why this will work
The 18 orgs are there -- we just need to stop excluding them with an overly strict filter. The cascading approach tries `school`/`local` first, then excludes known non-school types, and as a last resort shows all orgs. After deployment, the logs will also reveal exactly what `type` IC uses, letting us refine further if needed.


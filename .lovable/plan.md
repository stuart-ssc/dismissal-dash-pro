

# Fix: Students and Teachers Not Importing -- Wrong JSON Response Key

## Root Cause

The OneRoster API wraps response data in a key matching the **resource type**, not the endpoint path segment. The `paginate` method extracts the key using `endpoint.split('/').pop()`:

- `schools/{id}/students` -> looks for key `"students"` in response
- `schools/{id}/teachers` -> looks for key `"teachers"` in response

But the OneRoster API returns these as `{ "users": [...] }` because students and teachers are both "users" in the OneRoster data model. So the response parsing finds no matching key and returns an empty array.

This explains why:
- **Classes** work (endpoint ends in `/classes`, response key is `"classes"`)
- **Enrollments** work (endpoint ends in `/enrollments`, response key is `"enrollments"`)
- **Students** return 0 (endpoint ends in `/students`, but response key is `"users"`)
- **Teachers** return 0 (endpoint ends in `/teachers`, but response key is `"users"`)

Also: the school has **14,400+ enrollments** being fetched (144 paginated calls), which is still a performance concern.

## Fix

### 1. `supabase/functions/_shared/oneroster-client.ts` -- Fix response key mapping

Add a mapping of endpoint suffixes to known OneRoster response wrapper keys in the `paginate` method:

```typescript
// OneRoster response key mapping -- some endpoints use a different wrapper key
const keyOverrides: Record<string, string> = {
  'students': 'users',
  'teachers': 'users',
};
const resourceKey = keyOverrides[rawKey] || rawKey;
```

This ensures `students` and `teachers` endpoints correctly read from the `"users"` key in the response.

### 2. Clean up the 2,010 orphaned classes (optional)

The sync created classes but no students/teachers to go with them. After re-syncing, we may want to clean up classes that have no enrollments, or just let the next sync handle archiving.

### 3. Redeploy `sync-infinite-campus`

## Additional: Classes page spinning

This is likely caused by 2,010 classes being loaded with no teachers or students linked to them. Once teachers and students import correctly and enrollments link them, the page should work. If it remains stuck after re-sync, we can investigate the classes query separately.

## Files to change
- `supabase/functions/_shared/oneroster-client.ts` -- fix response key mapping in `paginate`
- Redeploy `sync-infinite-campus`


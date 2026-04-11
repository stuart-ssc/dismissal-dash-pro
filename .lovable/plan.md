

# Fix: Students Missing Grade Level from OneRoster

## Root Cause

The OneRoster API returns grade level as **`grades`** (an array of strings, e.g. `["06", "07"]`), not `grade` (singular string). Our `OneRosterUser` interface incorrectly defines `grade?: string`, which never matches the actual API response. So `student.grade` is always `undefined`, and every student gets `null` for `grade_level` -- which then hits the `NOT NULL` constraint and causes the batch insert to silently fail.

This is the actual reason **zero students** were persisted, not just a missing fallback value.

## Fix

### 1. `supabase/functions/_shared/oneroster-client.ts`

Update `OneRosterUser` interface:
```typescript
// Change:
grade?: string;
// To:
grades?: string[];
```

### 2. `supabase/functions/sync-infinite-campus/index.ts`

Update all grade_level assignments (lines ~311, 334, 363):
```typescript
// Change:
grade_level: student.grade ? parseInt(student.grade, 10) : null
// To:
grade_level: student.grades?.[0] || 'Unknown'
```

This reads the first grade from the array (most students have one), and falls back to `'Unknown'` to satisfy the `NOT NULL` constraint.

### 3. Redeploy `sync-infinite-campus`

## Files to change
- `supabase/functions/_shared/oneroster-client.ts` -- fix `OneRosterUser.grades` type
- `supabase/functions/sync-infinite-campus/index.ts` -- read `grades[0]` instead of `grade`


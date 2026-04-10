

# Fix: Filter Academic Sessions by Selected School

## Problem
The IC wizard's "Academic Sessions" preview fetches **all** sessions from the entire district via the OneRoster `/academicSessions` endpoint. When you select a specific school (e.g., East Jessamine Middle School), it should only show sessions relevant to that school.

## Solution

### 1. Add school-scoped session fetch to `oneroster-client.ts`
OneRoster supports `/schools/{sourcedId}/terms` to get academic sessions for a specific school. Add a new method:
```typescript
async getAcademicSessionsForSchool(schoolSourcedId: string): Promise<OneRosterAcademicSession[]> {
  return this.paginate<OneRosterAcademicSession>(`schools/${schoolSourcedId}/terms`);
}
```

### 2. Update `test-ic-connection/index.ts`
After the school list is fetched and a `suggestedMatch` is identified, fetch sessions scoped to that school instead of all district sessions. Fall back to all sessions if the school-scoped call fails (not all IC instances support it).

### 3. Update `ICTestConnectionStep.tsx` -- Re-fetch sessions on school selection
When the user selects a different school from the dropdown, trigger a new request to get sessions for that specific school. This means:
- Store sessions in local state, not just from the initial test result
- When `selectedSchool` changes, call the edge function again (or a lighter endpoint) to get that school's sessions
- Show a loading indicator while fetching

### Alternative (simpler, recommended)
Since the OneRoster `/schools/{id}/terms` endpoint may not be universally supported, a simpler approach: just filter the display. The academic sessions data from IC includes `parent` references. We can filter sessions whose `parent.sourcedId` matches the selected school. If no parent filtering is available, we show all sessions with a note that they are district-wide.

### Implementation approach
Given this is a preview/informational display in the wizard, the simplest effective fix is:
1. Keep fetching all sessions in the test endpoint (already working)
2. In the UI (`ICTestConnectionStep.tsx`), only display sessions after a school is selected, and label them as "District Academic Sessions" so it's clear they apply broadly
3. Optionally add the school-scoped fetch as an enhancement

This keeps the wizard functional without adding complexity to an already fragile IC integration flow.

## Files to change
- `supabase/functions/_shared/oneroster-client.ts` -- Add `getAcademicSessionsForSchool()` method
- `supabase/functions/test-ic-connection/index.ts` -- Use school-scoped session fetch when suggested match exists
- `src/components/wizard-steps/ICTestConnectionStep.tsx` -- Only show sessions after school selection; update display when school changes
- Redeploy: `test-ic-connection`


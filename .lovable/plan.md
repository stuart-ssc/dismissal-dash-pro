
Root cause is no longer just the OneRoster endpoint logic.

I inspected the wizard flow and found a second failure mode that matches “same result” even after backend fixes:

1. The school selector UI only fetches schools when `state.testResults` is empty.
2. The wizard saves all state, including `testResults.schools`, in `localStorage` under `ic-wizard-state`.
3. If the user reopens the setup after a failed/empty result, Step 3 reuses the old cached empty `schools` array and does not call the edge function again.
4. That means backend fixes can be deployed correctly, but the UI can still keep showing “No schools found” from stale local state.

Relevant code already confirms this:
- `src/components/ICConnectionWizard.tsx` restores/saves full wizard state from localStorage.
- `src/components/wizard-steps/ICTestConnectionStep.tsx` only runs `testConnection()` when `!state.testResults`.
- The empty-state message is shown whenever `schools?.length` is 0, even if that came from cached data.

Plan to fix this cleanly:

1. Remove stale-result behavior in the wizard
- Stop treating saved `testResults` as authoritative when entering Step 3.
- Re-run the school fetch when the user reaches the “Test & Select” step, especially for district-connected flows.
- Optionally preserve credentials/sync settings, but not cached school results.

2. Add an explicit refresh/reset path
- Add a “Refresh schools” action in `ICTestConnectionStep`.
- Add a safe reset that clears `testResults` and `selectedICSchool` before re-fetching.

3. Tighten wizard persistence
- In `ICConnectionWizard.tsx`, either:
  - exclude `testResults` from localStorage entirely, or
  - persist it with a short-lived timestamp and invalidate it on reopen.
- Also clear cached results when district connection info changes.

4. Improve step transition logic
- In `ICTestConnectionStep.tsx`, make the fetch run when entering the step, not just on first mount with empty state.
- Ensure Back/Continue/reopen cycles do not strand the user with stale school data.

5. Keep the existing server-side org fallback
- Do not remove the broader `getSchools()` fallback already present in `supabase/functions/_shared/oneroster-client.ts`.
- The client-side stale cache fix should be layered on top of that server fix.

6. Verification after implementation
- Open IC setup with a district-already-connected school.
- Confirm Step 3 makes a fresh request instead of reusing prior empty results.
- Confirm schools appear if the backend returns them.
- Confirm “Refresh schools” re-queries successfully.
- Confirm reopening the dialog does not restore an old empty selector state.

Technical notes:
- Primary files to update:
  - `src/components/ICConnectionWizard.tsx`
  - `src/components/wizard-steps/ICTestConnectionStep.tsx`
- No database changes needed.
- This is the most likely reason you are still seeing the exact same empty result after prior fixes.

If approved, I will implement the cache/state fix so the wizard actually pulls fresh school data again instead of replaying stale empty results.

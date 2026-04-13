

# Fix: Dashboard Still Prompts Setup After IC Sync

## Root Cause (two bugs)

### Bug 1: IC connection check queries wrong table
The dashboard (line 328) queries `ic_connections` to detect IC setup, but that table does not exist. The actual table is `infinite_campus_connections`. Result: `hasICConnection` is always false, so the IC status widget shows "Not Connected" even though there IS an active connection (id: `bc8992a1`).

### Bug 2: Setup checklist blocks dashboard even when IC sync is complete
`useSchoolSetupStatus` requires ALL of these to be true for `isReady`:
- `transportationReady` (buses OR car lines OR walkers)
- `hasTeacher`
- `hasStudent`
- `hasClass`
- `schoolUpdated`

The school has 104 teachers, 1,010 students, and 2,010 classes -- but 0 buses, 0 car lines, and 0 walkers. Transportation is a manual setup step that IC sync does not handle. So `isReady` is permanently false, which:
- Shows the "Getting your school ready" checklist card
- Overlays a blur on all dashboard widgets ("Complete the setup checklist to unlock these insights")
- Re-triggers the setup method dialog on every visit (since `isReady` is false and localStorage may not persist)

## Fix Plan

### 1. Fix IC connection check in Dashboard.tsx
Change the query from `ic_connections` to `infinite_campus_connections` so the dashboard correctly detects that IC is connected.

### 2. Make setup checklist IC-aware
When a school has a completed IC sync (active `infinite_campus_connections` record), treat the school as "set up" for the purposes of showing/hiding the setup prompts -- even if transportation hasn't been configured yet. Specifically:
- If `hasICConnection` is true AND the school has students and classes, skip the setup method dialog entirely
- Show the setup checklist only as a helpful guide (not as a blocker with the blur overlay) when IC is connected but transportation is still missing
- Never re-show the "IC or Manual?" dialog if an IC connection already exists

### 3. Update the blur overlay logic
The blur overlay (line 578-582) currently blocks ALL dashboard content when `!isReady`. Change this so the overlay only appears when the school has NO data at all (no students AND no classes), not when only transportation is missing.

## Files to Change
- `src/pages/Dashboard.tsx` -- fix `ic_connections` table name, update setup dialog/overlay logic
- No migration needed -- this is purely a UI logic fix

## Expected Outcome
- Dashboard detects the existing IC connection correctly
- Setup method dialog does not appear for schools that already have an IC connection
- Dashboard widgets are visible and usable even before transportation is configured
- Setup checklist still shows as a non-blocking guide with the transportation step unchecked


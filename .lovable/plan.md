
Problem confirmed:
- The sync is no longer the blocker.
- Your screenshot already shows the proof: the top cards say `14,916 students` and `89 teachers assigned`, so the page is reading synced assignment data.
- The specific rows shown in the screenshot are genuinely empty classes in the database, which is why they still show `No teacher assigned` and `0`.
- East Jessamine currently has:
  - `2,010` classes in the active session
  - `633` classes with at least one teacher or student
  - `1,377` empty classes/sections
- There are also many duplicate class names, so an empty section and a populated section can share nearly the same label, which makes the page look broken even when data exists.

What I will change:
1. Replace the current client-side “fetch classes, then decorate them” approach with a single server-side paginated query/RPC that returns:
   - class info
   - teacher names
   - student count
   - flags like `has_students` / `has_teachers`
   - total count
2. Change the default ordering so the page shows useful classes first:
   - assigned/populated classes first
   - then higher student count
   - then class name
3. Add an explicit filter so you can quickly switch between:
   - All classes
   - Assigned classes
   - Unassigned classes
   - With students
   - Empty sections
4. Improve row labels so duplicate IC sections are distinguishable:
   - show room/period where available
   - keep teacher/student badges visible at a glance
5. Apply the same fix to both dashboard and admin classes views so behavior stays consistent.

Files to update:
- new migration in `supabase/migrations/` for a secure paginated classes query/function
- `src/pages/Classes.tsx`
- `src/pages/admin/Classes.tsx`

Technical notes:
- The current page paginates `classes` first, then looks up `class_rosters` and `class_teachers` only for those visible IDs.
- That means alphabetical sorting can easily place large blocks of empty IC sections at the top, which is exactly what your screenshot shows.
- A server-side aggregated query is the correct fix because it allows filtering/sorting by populated status before pagination.
- No more sync changes are needed for this issue.

Expected outcome:
- The first page will no longer look like “nothing synced”.
- Populated classes with real teachers/students will appear first by default.
- Empty IC sections will still be accessible, but won’t dominate the initial view.

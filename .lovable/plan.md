
Problem found:
- The slow page at `/dashboard/people/classes` is wired to `src/pages/Classes.tsx` in `src/App.tsx`.
- The pagination work was added to `src/pages/admin/Classes.tsx`, which is only used for `/admin/classes`.
- So the page you are actually using still has the old expensive logic.

What is making it slow now:
- `src/pages/Classes.tsx` fetches all classes for the school with `.eq('school_id', schoolId)` and no server-side pagination.
- It then loops every class and runs a separate `class_rosters` count query for each class, causing an N+1 query pattern.
- It also fetches and filters/sorts/paginates in the browser after loading everything.
- It does not appear to filter the main class load by academic session, even though the UI text says “this session”.

Plan:
1. Replace the data-loading logic in `src/pages/Classes.tsx` with true server-side pagination
   - add `page` and `pageSize` state
   - use `.range(...)` and `{ count: 'exact' }` on the `classes` query
   - keep page size options `10, 25, 50, 100`

2. Stop loading all classes up front
   - fetch only the visible page of classes
   - apply search/filter in the query instead of client-side where practical

3. Eliminate the per-class roster count loop
   - after loading the current page’s class IDs, fetch `class_rosters` once for those IDs
   - fetch `class_teachers` once for those IDs
   - build maps in memory for counts/names

4. Align the page with the current academic session model
   - use `useActiveSchoolId()` instead of manually reading `profiles.school_id`
   - load academic sessions for the active school
   - default to the active session
   - filter classes and related data by `academic_session_id`

5. Keep the existing page functionality
   - preserve add/edit/manage students/assign coverage flows
   - update refresh callbacks so they re-query the current page instead of refetching the full dataset

6. Improve the stats area so it stays fast
   - use lightweight count queries for totals
   - avoid fetching all classes just to compute summary cards
   - if needed, make “total students” session-aware using a dedicated aggregate query rather than loading all class IDs first

7. QA after implementation
   - verify first paint loads quickly on `/dashboard/people/classes`
   - verify only 10 records load by default
   - verify switching to 25/50/100 works
   - verify search, session switching, previous/next paging, edit, manage students, and coverage assignment still work end to end

Technical details:
- Route mapping:
  - `/dashboard/people/classes` -> `src/pages/Classes.tsx`
  - `/admin/classes` -> `src/pages/admin/Classes.tsx`
- Root cause is not that pagination “is broken”; it is that the optimized file is not the file used by the dashboard route.
- Best fix is to port the optimized query pattern into `src/pages/Classes.tsx` rather than touching only the admin page again.

Files to change:
- `src/pages/Classes.tsx`
- possibly small shared-hook reuse from `src/hooks/useActiveSchoolId.ts` if needed, but likely no hook changes required

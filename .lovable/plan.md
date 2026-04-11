
Problem confirmed:
- The classes UI reads teacher assignments from `class_teachers`, so if that table is still empty the page will continue to show no teachers.
- The current sync code now falls back from `/schools/{id}/enrollments` to district-wide `/enrollments`, but teacher assignment creation still depends on a very strict check: `enrollment.role === 'teacher'`.
- In Infinite Campus / OneRoster, enrollment role values are often not exactly `"teacher"` (for example `teacherOfRecord`, `primaryTeacher`, uppercase variants, or other teacher-like role strings). If that is happening, the sync will fetch enrollments but silently skip teacher assignments.

What I found in code:
- `syncEnrollments` only creates teacher rows when `enrollment.role === 'teacher'`.
- There is no normalization like lowercase/trim, and no broader teacher-role handling.
- The current logging is better than before, but it still does not log role distribution, so we cannot see whether the API is returning teacher-like roles that fail the equality check.
- The dashboard classes page is correctly reading from `class_teachers`, so this is still a sync/data issue, not a page-render issue.

Plan:
1. Harden enrollment role handling in `supabase/functions/sync-infinite-campus/index.ts`
   - normalize `enrollment.role` with trim + lowercase
   - treat known teacher-like values as teacher assignments
   - treat known student-like values as roster assignments
   - log unknown/unhandled role values instead of silently ignoring them

2. Improve diagnostics in the sync
   - log a role breakdown from fetched enrollments
   - log counts for handled student roles, handled teacher roles, and unknown roles
   - log a few sample unknown role values so we can confirm what Infinite Campus is returning

3. Keep the existing enrollment fallback in `supabase/functions/_shared/oneroster-client.ts`
   - do not remove the new district-wide fallback
   - if needed, add one more log line clarifying whether data came from school-scoped or district-wide fallback

4. Verify the sync writes actual assignments
   - after implementation, trigger a manual sync for East Jessamine Middle
   - confirm the latest sync log now shows non-zero enrollment processing
   - confirm `class_teachers` rows are created and the classes page begins showing teacher names

Technical details:
- Most likely failure point now is not “no enrollments fetched” anymore, but “enrollments fetched with role values that do not equal exactly `teacher`”.
- Best implementation pattern is a helper like:
  ```ts
  const normalizedRole = (enrollment.role || '').trim().toLowerCase();
  const isTeacherRole = ['teacher', 'teacherofrecord', 'primaryteacher'].includes(normalizedRole) || normalizedRole.includes('teacher');
  const isStudentRole = ['student', 'pupil', 'learner'].includes(normalizedRole);
  ```
- Also add an `unknownRoles` map/count so the next sync makes the exact IC payload behavior visible in logs.

Files to change:
- `supabase/functions/sync-infinite-campus/index.ts`
- optionally a small extra log in `supabase/functions/_shared/oneroster-client.ts`

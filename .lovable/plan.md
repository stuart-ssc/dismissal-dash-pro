

# Add Role Re-assignment to Edit Person Dialog

## Problem
When Infinite Campus syncs staff, everyone comes in as "teacher." School admins need to promote a teacher to "school_admin" role directly from the Edit Person dialog. Currently, the dialog has no role field for staff.

## Approach

### 1. Add role selector to `EditPersonDialog.tsx`
- Add a `role` field to `formData` state, initialized from `person.role`
- Show a Role dropdown for staff (Teacher / School Admin) — only when editing a non-student
- School admins can only assign: `teacher` or `school_admin` (not `district_admin` or `system_admin`)

### 2. Handle role change on submit
When the role changes:
- **Teacher → School Admin**: Insert `school_admin` role into `user_roles`, remove `teacher` role. Also ensure `profiles` record exists (teachers with accounts already have one; teachers without accounts can't be promoted until they have one — show a warning).
- **School Admin → Teacher**: Insert `teacher` role into `user_roles`, remove `school_admin` role.
- Use upsert/delete on `user_roles` table with the person's ID.

### 3. Guard: only allow promotion for users with accounts
If a teacher was imported from IC and has no user account yet (`invitation_status` is not `completed`), disable the role dropdown and show a message: "This person must complete their account setup before their role can be changed."

### 4. Load current role on dialog open
Query `user_roles` for the person's ID to get their actual DB role, rather than relying solely on the display role passed in.

## Files Changed
- `src/components/EditPersonDialog.tsx` — add role dropdown, role change logic on submit

## Technical Details
- Role changes go to the `user_roles` table (not profiles)
- Delete old role row + insert new role row in a single submit handler
- The `person.role` prop uses display format ('Teacher', 'School Admin'); map to DB values (`teacher`, `school_admin`)
- No migration needed — `user_roles` table and `app_role` enum already include both values


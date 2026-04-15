

# Fix: Auto-assign Group Managers as Run Managers

## Problem
When creating a special use run, only the current user (you, Stuart) is added as a run manager. Jennifer Borders is the group manager but was never copied to the run. Additionally, Jennifer only exists in the `teachers` table (no user account/profile yet), and the `special_use_run_managers` table requires a `profiles` FK — so she literally cannot be inserted there today.

## Data Model Context
- `special_use_group_managers.manager_id` → references `teachers` table
- `special_use_run_managers.manager_id` → references `profiles` table
- Jennifer has a `teachers` record (`cea7cd6d`) but no `profiles` record (no account yet)

## Plan

### 1. Update run creation logic in `SpecialUseRunDialog.tsx`
After creating the run and assigning the current user as manager:
- Query `special_use_group_managers` for the selected group to get all group managers
- For each group manager, check if they have a matching `profiles` record (i.e., have an account)
- Insert those with profiles into `special_use_run_managers` (skip duplicates if creator is already a group manager)
- The creator is always added regardless

### 2. Show unlinked group managers as read-only on the detail page (`SpecialUseRunDetail.tsx`)
- After loading run managers, also fetch group managers from `special_use_group_managers` joined with `teachers`
- Display all run managers normally
- Display group managers who are NOT in the run managers list with a "No account" badge (read-only, greyed out)
- This makes Jennifer visible on the detail page even though she can't operate the run yet

### 3. No database migration needed
The existing schema supports this. We just need to change the application logic.

## Files Changed
- `src/components/SpecialUseRunDialog.tsx` — copy group managers with profiles to run managers on creation
- `src/pages/SpecialUseRunDetail.tsx` — fetch and display unlinked group managers as read-only


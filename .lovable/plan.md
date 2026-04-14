

# Auto-assign Teachers as Group Managers During Conversion

## Problem
When classes are converted to groups/teams, the assigned teachers are not carried over as group managers. Additionally, `special_use_group_managers.manager_id` has a foreign key to `profiles(id)` (requires an auth account), while `class_teachers.teacher_id` references `teachers(id)` (no auth required). This means IC-imported teachers who haven't been invited yet cannot be group managers.

## Solution

### 1. Database migration: Change FK on `special_use_group_managers`
- Drop the FK constraint `special_use_group_managers_manager_id_fkey` referencing `profiles(id)`
- Add a new FK constraint referencing `teachers(id)` instead
- This aligns with how `class_teachers` works — no auth account required

### 2. Database migration: Update `convert_classes_to_groups` RPC
- After creating each group and migrating students, query `class_teachers` for the source class
- Insert those teacher IDs into `special_use_group_managers` as managers of the new group
- Use `auth.uid()` as `assigned_by` (the admin performing the conversion)
- Include the count of managers assigned in the return value

### 3. Update `ManageGroupManagersDialog.tsx`
- Remove the `.not("account_completed_at", "is", null)` filter so all teachers (including uninvited IC imports) appear in the manager selection list
- Update the description text to reflect that any teacher can be assigned

### 4. Update `assigned_by` FK constraint
- The `assigned_by` column also references `profiles(id)` — this stays as-is since the person assigning (the admin) will always have an auth account

## Files to change
- **New migration** — alter FK on `manager_id`, update `convert_classes_to_groups` RPC
- **`src/components/ManageGroupManagersDialog.tsx`** — remove `account_completed_at` filter


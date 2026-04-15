

# Refactor: After School Activities to Use Groups

## Problem
After-school activities are currently a standalone system (`after_school_activities` table) with their own student roster (`student_after_school_assignments`) and separate management. The user wants activities to leverage the existing **special use groups** system — using group rosters and managers — and only add a location + active/inactive status as a transportation option.

## New Mental Model
An "After School Activity" = a **special use group** (which already has students, managers, academic session) + a **transportation configuration** record that adds:
- **Location** (e.g., "Back Gym", "Field #2")
- **Status** (active/inactive — e.g., Football is inactive in spring)

If no group exists yet, the user is prompted to create one first (link to Groups page).

## Plan

### 1. Database Migration
Create a new `activity_transport_options` table that links a special use group to transportation:

```sql
CREATE TABLE activity_transport_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES special_use_groups(id) ON DELETE CASCADE,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id)
);
```

Add RLS policies matching existing school data access patterns. Add an update trigger for `updated_at`.

### 2. Rewrite the Activities Tab in `Transportation.tsx`
Replace the current activities UI with:

- **"Link Group as Activity" button** — opens a dialog to select from existing special use groups (that aren't already linked) and set a location + status
- **If no groups exist** — show a message: "No groups available. Create a group first." with a link/button to `/dashboard/groups`
- **Activities list** — shows linked groups with: group name, group type badge, student count (from group roster), manager names (from group managers), location, status, and actions
- **Actions**: Edit (location/status only), Unlink, View Group (navigates to Groups page)
- **Remove**: "Add Activity" form, `ManageActivityStudentsDialog` usage, all direct `after_school_activities` CRUD

### 3. Update References to `after_school_activities`
- **`TemporaryTransportationDialog.tsx`**: Replace the "activity" transport type to query `activity_transport_options` joined with `special_use_groups` instead of `after_school_activities`
- **`ViewTemporaryTransportationDialog.tsx`**: Update the join to use the new table
- **`EditPersonDialog.tsx` / `AddPersonDialog.tsx`**: Update activity dropdown to pull from `activity_transport_options` + group name
- **`ClassroomMode.tsx`**: Update activity name resolution to use the new table
- **`student_temporary_transportation`**: The `after_school_activity_id` FK will need to reference the new `activity_transport_options.id` instead (or add a new column `activity_transport_option_id` and deprecate the old one)

### 4. Dismissal Group Integration
- Update dismissal group activity references (currently in `dismissal_group_activities` table) to reference `activity_transport_options` instead of `after_school_activities`
- This ensures the classroom mode and transportation columns still resolve activity names correctly

### 5. Keep Legacy Data Intact
- Do NOT drop `after_school_activities` table immediately — mark it deprecated
- Existing temporary transportation overrides referencing `after_school_activity_id` continue to work
- New overrides use the new `activity_transport_option_id`

## Files Changed
- **New migration** — `activity_transport_options` table + RLS + trigger
- `src/pages/Transportation.tsx` — rewrite Activities tab
- `src/components/TemporaryTransportationDialog.tsx` — update activity transport type
- `src/components/ViewTemporaryTransportationDialog.tsx` — update join
- `src/components/EditPersonDialog.tsx` — update activity dropdown
- `src/components/AddPersonDialog.tsx` — update activity dropdown
- `src/pages/modes/ClassroomMode.tsx` — update activity name resolution

## What Stays the Same
- Groups page (`GroupsTeams.tsx`) — unchanged, it's the source of truth for group management
- Group creation dialog (`SpecialUseGroupDialog.tsx`) — unchanged
- Buses, car lines, walker locations — unchanged


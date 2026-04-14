

# Remove Classes Column, Add "Manage Classes" to Actions Menu

## What changes

### 1. Remove the Classes column from all table views
- Remove the "Classes" `TableHead` from both desktop tables (admin view ~line 1016, teacher view ~line 1580)
- Remove the Classes `TableCell` from both desktop table bodies (~lines 1169-1181 and 1626-1639)
- Remove the Classes display from both mobile card layouts (~lines 955-966 and 1551-1562)

### 2. Create a new `ManagePersonClassesDialog` component
A dialog opened from the Actions menu that lets admins manage which classes a person belongs to (for students) or teaches (for teachers/admins). Features:

**For Students:**
- Shows current class enrollments with period info (period number, name, times) in a list
- "Add to Class" section with a searchable select of available classes at the school (filtered by session)
- Remove button on each enrolled class
- Uses `class_rosters` table for add/remove

**For Teachers:**
- Shows current class teaching assignments with period info
- "Assign to Class" section with a select of available classes
- Remove button on each assignment
- Uses `class_teachers` table for add/remove

**Period information display:** Each class row shows class name, period number, period name, and start/end times when available.

**No drag-and-drop:** Given the data is server-side paginated and class assignments are individual DB operations, a straightforward add/remove list is more reliable and consistent with the existing `ManageClassStudentsDialog` pattern. The dialog will show classes sorted by period number for a natural schedule view.

### 3. Add "Manage Classes" menu item to all Actions dropdowns
- Add a `GraduationCap` icon + "Manage Classes" `DropdownMenuItem` in all 4 action menus (admin desktop, admin mobile, teacher desktop, teacher mobile)
- Opens the new dialog with the person's ID, role, school ID, and session ID
- Available for both students and teachers/admins

## Files
- **New: `src/components/ManagePersonClassesDialog.tsx`** — dialog component with add/remove class functionality, period info display
- **Edit: `src/pages/People.tsx`** — remove Classes column/cells from all views, add "Manage Classes" to all action menus, add state for the dialog, import the new component

## Technical details

**Dialog data flow:**
- On open, fetch current assignments via `class_rosters` (students) or `class_teachers` (teachers) joined with `classes` for period data
- Fetch available classes via `get_school_classes` RPC or direct query on `classes` table filtered by session
- Add: `INSERT` into `class_rosters` or `class_teachers`
- Remove: `DELETE` from `class_rosters` or `class_teachers`
- On change, invalidate `people-paginated` query cache

**Class list display per person:**
```
Period 1 · Math 101 (Room 204) · 8:00-8:50    [Remove]
Period 2 · English 201 (Room 112) · 8:55-9:45  [Remove]
(no period) · Homeroom                          [Remove]
```


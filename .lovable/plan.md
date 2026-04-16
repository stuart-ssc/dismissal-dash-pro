

# Clickable Count Badges to Open Manage Dialogs

## Problem
Student, teacher, and manager count badges in tables are static. They should be clickable to open the corresponding "Manage..." dialog directly.

## Changes

### 1. Classes Page (`src/pages/Classes.tsx`)
- **Student count badge** (lines ~682, ~712): Make clickable — clicking opens `ManageClassStudentsDialog` for that class (sets `managingClass` state)
- Style: `cursor-pointer hover:bg-primary/20` on the Badge

### 2. Groups Page (`src/pages/GroupsTeams.tsx`)
- **Student count badge** (line ~443 desktop, ~413 mobile): Make clickable — opens `ManageGroupStudentsDialog` (sets `selectedGroup` + `studentsDialogOpen`)
- **Manager count** (line ~444 desktop, ~417 mobile): Wrap in a Badge, make clickable — opens `ManageGroupManagersDialog` (sets `selectedGroup` + `managersDialogOpen`)

### 3. Transportation Page (`src/pages/Transportation.tsx`)
- **Student count badge** (lines ~2768 mobile, ~2870 desktop): Make clickable — navigates to Groups page (since students are managed via the linked group, not on Transportation directly). Use `navigate('/dashboard/groups')`
- **Manager count badge** (lines ~2817, ~2859): Same — navigate to Groups page since managers are managed there

### 4. Admin Classes Page (`src/pages/admin/Classes.tsx`)
- **Student count badge** (line ~372): This page doesn't have a ManageClassStudentsDialog wired up. Add state + dialog import, make badge clickable to open it.

## Implementation Pattern
```tsx
// Clickable badge example
<Badge
  variant="secondary"
  className="cursor-pointer hover:bg-secondary/80"
  onClick={() => { setSelectedGroup(group); setStudentsDialogOpen(true); }}
>
  {group.student_count}
</Badge>
```

## Files Changed
- `src/pages/Classes.tsx` — clickable student count badges
- `src/pages/GroupsTeams.tsx` — clickable student + manager count badges
- `src/pages/Transportation.tsx` — clickable badges navigate to groups page
- `src/pages/admin/Classes.tsx` — clickable student count badge + wire up dialog




# Enhance Manage Group Students Dialog

## Current State
The dialog shows `student_id • Grade {grade_level}` under each name. When `student_id` is empty, only `· Grade XX` appears (matching the screenshot). The dialog already supports multi-select via checkboxes — but lacks bulk selection by grade or class.

## Changes — `src/components/ManageGroupStudentsDialog.tsx`

### 1. Fix the subtitle display
Show Student ID only when present. Always show grade. Format: `ID: 12345 · Grade 08` or just `Grade 08` when no student ID.

### 2. Add Grade and Class filter dropdowns
Above the student list, add two filter selects:
- **Grade filter** — populated from distinct grade levels in the student list. Selecting a grade filters the visible list.
- **Class filter** — fetch classes for the school/session. Selecting a class filters to only students enrolled in that class (via `class_rosters`).

Both filters work alongside the search input. Clearing a filter shows all students again.

### 3. Add "Select All Filtered" / "Deselect All Filtered" buttons
When a grade or class filter is active, show a small link/button like "Select all 24 filtered" that checks all currently visible students at once — enabling true bulk selection by grade or class.

### 4. Fetch class roster data
On dialog open, also fetch `class_rosters` joined with `classes` to build a map of student_id → class names. This powers the class filter and optionally shows the class name in the subtitle.

## Data flow
```
students query (existing) → all school students for session
class_rosters + classes query (new) → student-to-class mapping
Grade filter + Class filter + Search → filteredStudents
Select All Filtered → bulk toggle selectedStudents set
```

## File changes
- **Edit: `src/components/ManageGroupStudentsDialog.tsx`** — add grade/class filter selects, select-all button, fix subtitle, fetch class data


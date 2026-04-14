

# Simplify Student Display in Manage Group Students Dialog

## Problem
The student listing currently shows Student ID, Grade, and all class names in a subtitle line, which is cluttered and overflows (as seen in the screenshot).

## Change
Simplify each student row to show: **First Name Last Name** on one line with **(Grade XX)** inline — no subtitle line, no student ID, no class list.

## File: `src/components/ManageGroupStudentsDialog.tsx`

Replace the current two-line display (lines 333-341):
```tsx
<div className="flex-1 min-w-0">
  <div className="font-medium">
    {student.first_name} {student.last_name}
  </div>
  <div className="text-sm text-muted-foreground truncate">
    {student.student_id ? `ID: ${student.student_id} · ` : ''}
    Grade {student.grade_level}
    {classes.length > 0 && ` · ${classes.map(c => c.class_name).join(', ')}`}
  </div>
</div>
```

With a single-line display:
```tsx
<div className="flex-1 min-w-0">
  <div className="font-medium">
    {student.first_name} {student.last_name} <span className="text-muted-foreground font-normal">(Grade {student.grade_level})</span>
  </div>
</div>
```

One file, ~3 lines changed.


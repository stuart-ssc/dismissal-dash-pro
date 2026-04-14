

# Clickable Sort Headers + Table Border on People Page

## Changes

### 1. Replace sort dropdown with clickable table headers
Remove the sort dropdown and `ArrowUpDown` icon from the filter bar. Instead, make the Name, Role, and Grade `TableHead` cells clickable with sort arrows (ChevronUp/ChevronDown). Clicking toggles sort direction; active column shows a filled arrow.

Update `handleSortChange` to toggle direction when clicking the same column:
```
if (sortBy === column) toggle sortOrder
else set sortBy = column, sortOrder = 'asc'
```

### 2. Add border wrapper to both desktop tables
Wrap both desktop `Table` instances (lines ~1026 and ~1625) in `<div className="rounded-md border bg-background/50">` to match the Classes page pattern.

### 3. Apply to both table instances
The People page has two table renders (school_admin view ~line 1026 and teacher view ~line 1625). Both get the same clickable headers and border treatment.

## Scope
- **`src/pages/People.tsx`** — remove sort dropdown from filter bar, add clickable sort headers with arrows to both table instances, add `rounded-md border` wrapper, import `ArrowUp`/`ArrowDown` icons


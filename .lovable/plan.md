

# Add Search Input and Clean Up People Management Header

## What changes

### 1. Add search input to the filter bar
The `searchQuery` state already exists and is wired to the paginated RPC, but there's no text input in the UI. Add a search input with the magnifying glass icon, matching the Classes page pattern.

### 2. Restructure the header to match Classes page layout
Current People page header has:
- Title with icon prefix, session badge below on its own line, academic session selector in a separate bordered box

Classes page pattern has:
- Title with inline session badge (no icon prefix), description below, action buttons right-aligned
- Search bar and filters inside CardContent (no separate bordered session box)

Changes:
- Move the session badge **inline** with the title (like Classes page)
- Remove the separate "Academic Year / Session" bordered box — move the session selector into the filter bar row (like Classes does)
- Remove the `Users` icon from the title
- Add `Search` icon + `Input` for search to the filter bar (first element, like Classes)
- Import `Search` and `Input` (Input is not currently imported in People.tsx)

### 3. Reset page on search change
Add `searchQuery` to the dependency that resets `currentPage` to 1.

## Files to edit
- **`src/pages/People.tsx`** — add Input/Search imports, restructure CardHeader, add search input to filter bar, remove standalone session selector box

## Technical details

**Header restructure (lines ~703-739):**
```
CardTitle: "People Management" + inline Badge (session name)
CardDescription: "Manage students, teachers, and administrators"
Right side: View Archived + Add Person buttons
```

**Filter bar restructure (lines ~742-857):**
- Remove the academic session bordered box (lines 742-763)
- Add search input as first element in filter bar
- Move academic session dropdown into the filter bar alongside Role/Grade filters
- Keep sort and results count as-is



# Fix Groups & Teams Page Header Layout

Match the Classes Management page layout where the title, session badge, description, and action buttons are all inside the card header.

## Changes to `src/pages/GroupsTeams.tsx`

### Current (broken) layout
- Search field full-width on its own row
- Settings icon + New Group button on a second row below search
- Card header has title, badge on separate line, description below

### Target layout (matching Classes page)
- Move search field, filters, and action buttons **inside** `CardContent` (like Classes page has its search/filters inside CardContent)
- Card header: title + session badge inline on one row, action buttons (Settings dropdown + New Group) on the right side, description below
- Remove the standalone div above the card that currently holds search + buttons

### Specific edits
1. Restructure `CardHeader` to use `flex flex-col md:flex-row md:justify-between md:items-center gap-4` layout
2. Put title + badge in a `flex items-center gap-3` wrapper (left side)
3. Put Settings dropdown + New Group button on the right side of the header
4. Move search input inside `CardContent` at the top of the data area
5. Remove the outer `div.space-y-3` that currently wraps search + action buttons above the card

## File
- `src/pages/GroupsTeams.tsx` (lines ~208–297)

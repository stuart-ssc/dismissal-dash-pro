

# Adjustments to Convert Classes to Groups Wizard

## Changes

### 1. Fix header spacing
- Remove the back arrow button (breadcrumb already exists above)
- Add horizontal padding (`px-4 sm:px-6`) to the page content wrapper

### 2. Add bulk Convert/Hide buttons
- Add two buttons next to Select All/Deselect All: "Set Selected to Convert" and "Set Selected to Hide"
- These update the `action` field on all currently selected (and visible/filtered) candidates

### 3. Add keyword toggle controls
- Add a row of toggleable keyword chips/badges above the table (e.g., "Athletics", "Club", "Homeroom", "Advisory", "Study Hall", "Band/Choir", "Field Trip")
- Each keyword can be toggled on/off -- when off, classes matching only that keyword are deselected and dimmed
- This lets each school decide which patterns to include (e.g., keep homeroom as a class, convert athletics)
- Store active keywords in state; the candidate list filters/selects based on which keywords are active

### 4. Add pagination
- Add page size selector (10, 25, 50, 100) and Previous/Next page controls below the table
- Paginate the `filtered` list client-side (all data is already loaded)
- Show "Showing X to Y of Z" text

## File to modify
- `src/pages/ConvertClassesToGroups.tsx` -- all four changes in this single file


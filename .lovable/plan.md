

# UI Polish: Capitalize Type Badges + Manager Count with Hover

## Changes

### 1. Capitalize group_type in badges
Replace raw `activity.group_type` with a capitalize helper everywhere it's displayed. Apply to both mobile cards and desktop table. Also capitalize in the group selector dropdown.

Helper: `text.charAt(0).toUpperCase() + text.slice(1).replace(/_/g, ' ')` — turns `field_trip` → `Field trip`, `athletics` → `Athletics`.

### 2. Manager count badge with hover tooltip
Replace the raw comma-separated manager names with a count badge (e.g., "5 managers"). Wrap it in a `HoverCard` or `Tooltip` that reveals the full list on hover.

Locations to update in `Transportation.tsx`:
- **Desktop table** (line ~2842): Replace `{activity.manager_names || '-'}` with a count badge + tooltip
- **Mobile cards** (line ~2813): Same treatment
- **Type badges** (lines ~2764, ~2840, ~3880): Capitalize the value

### 3. Data model tweak
Change `manager_names: string` on `ActivityTransportRecord` to `manager_list: string[]` so we can count and display individually. Update the data fetch to store an array instead of joining to a string.

## Files Changed
- `src/pages/Transportation.tsx` — capitalize type, manager count badge with hover


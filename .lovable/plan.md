

# Fix Class Management Page (`src/pages/Classes.tsx`)

## Changes

### 1. Remove Grade column
- Delete the "Grade" `TableHead` (line 648)
- Delete the Grade `TableCell` with `getGradeBadge` (line 665)
- Remove grade from the mobile card view (lines 632-634)
- Remove the `getGradeBadge` helper (lines 414-421)
- Update the empty-state `colSpan` from 5 to 4

### 2. Add "Hide Class" to the Actions dropdown
- Import `EyeOff` from lucide-react
- Import `useQueryClient` from `@tanstack/react-query`
- Add `handleHideClass` function that sets `is_hidden = true` via Supabase and invalidates queries
- Add a "Hide Class" `DropdownMenuItem` in both the desktop table and mobile card action menus (after the existing items like Edit, Manage Students, etc.)

### File
- `src/pages/Classes.tsx` — the school admin view at `/dashboard/people/classes`


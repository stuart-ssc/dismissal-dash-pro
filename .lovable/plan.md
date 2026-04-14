

# Instant Hide & Hidden Classes Filter

## What changes

### 1. Optimistic hide (instant visual feedback)
When "Hide Class" is clicked, immediately remove the class from the local list before the DB call completes. On error, roll back and show an error toast.

Update `handleHideClass` in `src/pages/Classes.tsx` to:
- Use `queryClient.setQueryData` to optimistically remove the hidden class from the current `classes-paginated` query cache
- Also decrement the stats cache optimistically
- On error, invalidate queries to roll back to server state

### 2. Add "Hidden" filter option
Add a `hidden` option to the assignment filter dropdown so users can find and manage hidden classes:
- Add `<SelectItem value="hidden">Hidden</SelectItem>` to the filter `<Select>` (~line 564)

### 3. Update the RPC to support the "hidden" filter
The `get_classes_paginated` RPC currently excludes hidden classes. It needs to handle `p_filter = 'hidden'` by returning **only** hidden classes instead.

**New migration**: `ALTER` the `get_classes_paginated` function to:
- When `p_filter = 'hidden'`: filter to `is_hidden = true`
- All other filters: keep existing `is_hidden = false` behavior

### 4. Add "Unhide" action for hidden classes
When viewing the "Hidden" filter, the dropdown action should show "Unhide Class" instead of "Hide Class". Implement `handleUnhideClass` that sets `is_hidden = false` with the same optimistic pattern.

## Files
- `src/pages/Classes.tsx` — optimistic updates, hidden filter, unhide action
- **New migration** — update `get_classes_paginated` RPC to support `'hidden'` filter value


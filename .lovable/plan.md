

# Add Server-Side Pagination to Classes Page

## Problem
The Classes page fetches ALL 2,010 classes in one query, plus runs two additional bulk queries (`class_rosters` and `class_teachers`) with `.in('class_id', classIds)` on all 2,010 IDs. This is extremely slow and hits the Supabase 1,000-row default limit on the roster/teacher lookups too.

## Solution
Add proper server-side pagination with a configurable page size selector (10, 25, 50, 100).

### Changes to `src/pages/admin/Classes.tsx`

1. **Add pagination state**: `page` (starting at 0), `pageSize` (default 10)
2. **Paginate the classes query**: Add `.range(page * pageSize, (page + 1) * pageSize - 1)` to the classes query, and use Supabase's `{ count: 'exact' }` option to get total count without fetching all rows
3. **Only fetch rosters/teachers for the current page's class IDs** (max 100 IDs instead of 2,010)
4. **Update summary stats**: Use the `count` from the paginated query for "Total Classes". For "Total Students", "With Period Data", and "Missing Period Data" -- these will reflect the current page or we fetch separate lightweight count queries
5. **Add page size selector**: A `Select` dropdown with options 10, 25, 50, 100, placed next to the academic session selector
6. **Add pagination controls**: Previous/Next buttons with current page indicator at the bottom of the table
7. **Add search input**: Optional text filter for class name to help navigate large lists

### Technical approach

```typescript
// Paginated query with exact count
const { data: classesData, error, count } = await supabase
  .from('classes')
  .select('id, class_name, room_number, grade_level, period_number, period_name, period_start_time, period_end_time', { count: 'exact' })
  .eq('school_id', schoolId)
  .eq('academic_session_id', selectedSessionId)
  .order('period_number', { ascending: true, nullsFirst: false })
  .order('class_name', { ascending: true })
  .range(page * pageSize, (page + 1) * pageSize - 1);
```

The roster and teacher sub-queries then only operate on the 10-100 class IDs from the current page, making them fast.

### Summary stats
- "Total Classes" will use the `count` from the paginated query (exact count without fetching all rows)
- "With Period Data" / "Missing Period Data" will be calculated from the current page's data, with a note showing "on this page" or we run two separate lightweight count queries

## Files to change
- `src/pages/admin/Classes.tsx` -- add pagination state, paginated query, page size selector, pagination controls




# Fix: Search Should Only Reload Table, Not Entire Page

## Problem
Line 606 checks `if (loading || isLoading)` and returns a **full-screen spinner**, replacing the entire page. When search triggers a new query, `isPeopleLoading` (from react-query) flips to `true`, causing the whole page to unmount and show a spinner. This is the "reload" effect.

## Solution
Separate the **initial auth/page load** spinner from the **data refetch** loading state:

1. **Keep the full-page spinner only for initial auth loading** — use `loading` (from `useAuth`) and `isLoadingSchoolId` only
2. **Show an inline loading indicator on the table** when data is refetching — use `isPeopleLoading` or `isFetching` from react-query
3. Use `keepPreviousData: true` in `usePaginatedPeople` so stale results stay visible while new data loads (prevents the table from going blank)

## Changes

### `src/hooks/usePaginatedPeople.ts`
- Add `keepPreviousData: true` (or `placeholderData: keepPreviousData` for TanStack Query v5) to the query options so old data persists during refetches

### `src/pages/People.tsx`
- **Line 606**: Change the early return to only check `loading` (auth) — not `isPeopleLoading`
- **Line 120**: Remove `isPeopleLoading` from the combined `isLoading` variable (or rename it)
- Add a subtle inline loading indicator (e.g., a small spinner or opacity overlay) on the table area when `isPeopleLoading` is true, so users see the table is updating without losing the whole page
- Also expose `isFetching` from the hook to distinguish initial load vs background refetch if needed


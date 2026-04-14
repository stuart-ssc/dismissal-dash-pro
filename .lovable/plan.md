

# Fix: Special Use Run Detail Not Loading

## Problem
The query in `SpecialUseRunDetail.tsx` (line 64-70) uses `manager:profiles(...)` inside `special_use_run_managers`, but that table has TWO foreign keys to `profiles`: `manager_id` and `assigned_by`. PostgREST can't auto-resolve which one to use and throws error PGRST201.

## Fix — `src/pages/SpecialUseRunDetail.tsx`

Change line 65 from:
```tsx
manager:profiles(
```
to:
```tsx
manager:profiles!special_use_run_managers_manager_id_fkey(
```

This explicitly tells PostgREST to use the `manager_id` foreign key relationship.

One file, one line changed.




# Fix: "invalid input syntax for type uuid" Error in Special Use Run Dialog

## Root Cause
When saving/updating a special use run, `formData.group_id` can be an empty string `""`. This gets passed to Supabase as-is, and Postgres rejects `""` as an invalid UUID.

Similarly, on line 122, `activeSession?.id` could be `undefined` when loading groups, causing a silent filter failure.

## Fix — `src/components/SpecialUseRunDialog.tsx`

1. **Add validation before submit** — check that `group_id` is not empty before calling insert/update. Show a toast error if missing.

2. **Guard the `loadData` query** — skip the groups query if `activeSession` is null (avoid passing undefined to `.eq()`).

### Specific changes:

**In `handleSubmit` (~line 147):** Add early validation:
```tsx
if (!formData.group_id) {
  toast.error("Please select a group");
  setLoading(false);
  return;
}
```

**In `loadData` (~line 110-122):** Handle missing session gracefully — if no active session, set groups to empty and return early instead of querying with `undefined`.

One file, ~5 lines added.


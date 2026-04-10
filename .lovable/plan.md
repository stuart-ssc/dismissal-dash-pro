

# Fix: Permission Check Fails in trigger-manual-sync

## Root Cause
Line 49 of `trigger-manual-sync/index.ts` calls `can_manage_school_data` via the **service role client** (`supabaseAdmin`). This RPC function uses `auth.uid()` internally to check the caller's identity, but the service role client has no auth context -- so `auth.uid()` is NULL, and the function always returns `false`. This produces a 403 response, which the Supabase SDK throws as a "non-2xx" error.

## Fix
Use the **authenticated client** (`supabaseClient`) for the `can_manage_school_data` RPC call instead of `supabaseAdmin`. The authenticated client carries the user's JWT, so `auth.uid()` works correctly.

### Change in `trigger-manual-sync/index.ts`
```typescript
// Line 49: Change supabaseAdmin to supabaseClient
const { data: canManage } = await supabaseClient.rpc('can_manage_school_data', {
  target_school_id: schoolId
});
```

### Redeploy
Redeploy `trigger-manual-sync`.

## Files changed
- `supabase/functions/trigger-manual-sync/index.ts` -- one-line fix on line 49




# Fix: Sync Crash + Better Error Handling

## Root Cause
In `sync-infinite-campus/index.ts` line 884, the auto-merge processing uses `connection.school_id` -- but `connection` is not defined in this scope. It should be `schoolId`. This causes a `ReferenceError` crash after the sync data is written but before the sync log is marked as complete.

The result:
1. Sync data actually gets partially written
2. The sync log stays in "running" status forever (never marked complete or error)
3. `trigger-manual-sync` gets a 500 from `sync-infinite-campus`, throws a generic "non-2xx" error to the client
4. The UI shows a vague error toast with no way to retry or see what happened

## Fix (2 changes)

### 1. Fix the variable reference in `sync-infinite-campus/index.ts`
Line 884: Change `connection.school_id` to `schoolId`

```typescript
// Before (line 884)
body: { schoolId: connection.school_id, syncLogId },

// After
body: { schoolId, syncLogId },
```

### 2. Better error handling in `trigger-manual-sync/index.ts`
The `supabaseAdmin.functions.invoke()` call on line ~95 can fail with a non-2xx. Wrap it to extract the actual error message from the response body instead of just showing "non-2xx":

```typescript
const { data: syncResult, error: syncError } = await supabaseAdmin.functions.invoke(...);

if (syncError) {
  // Try to extract meaningful error from the response
  const errorMessage = syncError.message || 'Sync failed';
  console.error('Manual sync error:', errorMessage);
  return new Response(JSON.stringify({ 
    error: errorMessage,
    details: 'Check sync history for more details' 
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

Using HTTP 200 with `{ error: ... }` ensures the Supabase SDK doesn't throw and the client can read the actual error details.

### 3. Redeploy both functions
- `sync-infinite-campus`
- `trigger-manual-sync`

## Files to change
- `supabase/functions/sync-infinite-campus/index.ts` -- Fix `connection.school_id` to `schoolId` on line 884
- `supabase/functions/trigger-manual-sync/index.ts` -- Improve error handling for the inner function call

## Why this will work
The crash is definitively caused by the undefined `connection` variable reference. Fixing it allows the sync to complete normally. The improved error handling ensures future failures surface meaningful messages instead of "non-2xx."


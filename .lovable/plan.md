

# Fix: Clean Up Stuck Syncs + Prevent Future Stuck Syncs

## Problem
Two sync logs are permanently stuck in `in_progress` status (IDs: `d911a02d` and `b32b5e69`). The edge function either timed out (CPU limit) or crashed, and the error handler never ran -- leaving the sync logs un-updated. The UI sees these as perpetually running syncs.

## Fix (2 parts)

### 1. Clean up the two stuck sync logs
Run a SQL update to mark both stuck syncs as `failed` with a clear error message.

### 2. Add a stale sync detector to `sync-infinite-campus`
At the start of the sync function, before creating a new sync log, mark any `in_progress` syncs for this school that are older than 10 minutes as `failed` (with message "Sync timed out"). This prevents future stuck syncs from accumulating.

Add this right before the "Create sync log" block (~line 774):

```typescript
// Clean up any stuck syncs older than 10 minutes
await supabaseAdmin
  .from('ic_sync_logs')
  .update({
    status: 'failed',
    completed_at: new Date().toISOString(),
    error_message: 'Sync timed out - automatically cleaned up',
  })
  .eq('school_id', schoolId)
  .eq('status', 'in_progress')
  .lt('started_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());
```

### Files to change
- `supabase/functions/sync-infinite-campus/index.ts` -- add stale sync cleanup
- SQL query to fix the two existing stuck records

### Redeploy
Redeploy `sync-infinite-campus`.


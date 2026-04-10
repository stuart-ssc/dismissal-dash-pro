

# Fix: Missing `ic_sync_configuration` Table + Sync Now Error

## Problem
The `ic_sync_configuration` table was never created via migration, but both `trigger-manual-sync` (edge function) and `ICSyncControlPanel` (client) query it. This causes:
1. The edge function returns HTTP 404 ("Sync configuration not found"), which the SDK surfaces as "non-2xx status code"
2. The client-side control panel logs errors every 30 seconds in the console

## Solution: Two-part fix

### 1. Update `trigger-manual-sync` to work without `ic_sync_configuration`
Instead of requiring sync config, make it optional. If the table/row doesn't exist, skip the config check and invoke `sync-infinite-campus` directly without passing `syncConfig`. This is the right approach because sync config (scheduling, pause/resume) is an optional feature -- manual sync should always work if the IC connection exists.

Changes to `trigger-manual-sync/index.ts`:
- Replace the `ic_sync_configuration` query with a check for an active IC connection (via `ic_school_mappings` + `ic_district_connections`)
- If sync config exists, check pause status; if not, proceed anyway
- Remove hard dependency on `ic_sync_configuration` for the sync to trigger
- Skip the `calculate_next_sync_time` RPC if no config exists

### 2. Update `ICSyncControlPanel` to handle missing table gracefully
- Catch the PGRST205 error ("table not found") and treat it the same as "no config found"
- Show a simplified control panel that just has the "Sync Now" button without pause/schedule controls when no config table exists
- Stop the 30-second polling error spam

### 3. Redeploy `trigger-manual-sync`

## Files to change
- `supabase/functions/trigger-manual-sync/index.ts` -- Remove hard dependency on `ic_sync_configuration`; look up IC connection from `ic_school_mappings` + `ic_district_connections` instead
- `src/components/ICSyncControlPanel.tsx` -- Handle missing table gracefully, suppress PGRST205 errors

## Technical detail
The `sync-infinite-campus` function already receives `syncConfig` as optional (`syncConfig?: any`), so passing `undefined` is safe. The actual sync logic uses the IC connection credentials from `ic_district_connections`, not from sync config.


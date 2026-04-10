

# Fix: Edge Function Deployment for IC Integration

## Problem
The "Edge Function returned a non-2xx status code" error occurs because the updated `test-ic-connection` and the new `connect-ic-district` edge functions have not been deployed to Supabase. The code changes were made locally but never pushed to the live environment.

## Solution

### 1. Deploy updated edge functions
Deploy these edge functions to Supabase:
- **`test-ic-connection`** -- updated to accept `appName` and return school list
- **`connect-ic-district`** -- new function for district-level credential storage

### 2. Verify the `ic_district_connections` table exists
Confirm the migration `20260410174829` ran successfully and created the `ic_district_connections` and `ic_school_mappings` tables.

### 3. Fix potential permission issue
Stuart is a `school_admin`. The `test-ic-connection` function checks `user_schools` for school access. If Stuart's `user_schools` row is still missing (from the earlier signup bug), the function will return 403. The data fix migration from earlier should have handled this, but we need to verify.

## Files to deploy
- `supabase/functions/test-ic-connection/index.ts`
- `supabase/functions/connect-ic-district/index.ts`
- `supabase/functions/_shared/oneroster-client.ts` (shared dependency)


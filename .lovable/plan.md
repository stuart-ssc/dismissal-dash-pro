
Fix the manual Infinite Campus sync by aligning the edge function with the real database schema and tightening the UI handling.

1. Fix the real backend failure in `sync-infinite-campus`
- Update the `ic_sync_logs` insert to only use columns that actually exist in the schema.
- Remove unsupported fields currently being inserted:
  - `config_snapshot`
  - `skipped_data_types`
  - `sync_reason`
- Stop using the district connection ID as `connection_id` when the column still references `infinite_campus_connections`.
- Use `null` for `connection_id` in district-level syncs, or only set it for legacy per-school connections.
- Make the initial sync log insert succeed before any IC API work begins.

2. Fix status values so the UI can understand sync results
- `sync-infinite-campus` currently writes `status: 'success'`, while the UI expects `completed`, `failed`, or `in_progress`.
- Change the success update to `completed`.
- Make the failure path consistently write `failed` plus `error_message/error_details`.
- If needed, normalize any “running” value to the status the UI expects.

3. Improve the sync history/control UI after backend fix
- Ensure `ICSyncTab`, `ICOverviewTab`, `ICConnectionStatus`, and `ICSyncStatusWidget` all treat the same statuses consistently.
- Keep the “Sync Now” button usable after a failure.
- Surface the returned error message from `trigger-manual-sync` clearly in the toast instead of generic fallback wording.

4. Verify the path that produced the current error
- Re-test the exact flow from `/dashboard/integrations/infinite-campus?tab=settings`.
- Confirm clicking “Sync Now” creates a sync log instead of failing immediately.
- Confirm the latest sync appears in history with a readable status and any error details if the downstream sync fails later.

Technical details
- Root cause from logs: `sync-infinite-campus` throws `Failed to create sync log`.
- Why: the function inserts fields not present in `public.ic_sync_logs`, and also sets `connection_id` to a district connection ID even though that foreign key still points to `public.infinite_campus_connections`.
- Evidence from schema:
  - Existing columns include `school_id`, `connection_id`, `sync_type`, `status`, counts, `error_message`, `error_details`, `metadata`.
  - Missing columns: `config_snapshot`, `skipped_data_types`, `sync_reason`.
- Secondary bug:
  - Backend writes `success`
  - UI reads `completed`
  - This mismatch can leave the interface looking broken even after the insert issue is fixed.

Files to change
- `supabase/functions/sync-infinite-campus/index.ts`
- Possibly small follow-up adjustments in:
  - `src/components/ic/ICOverviewTab.tsx`
  - `src/components/ICConnectionStatus.tsx`
  - `src/components/ICSyncStatusWidget.tsx`
  - `src/components/ic/ICSyncTab.tsx`

Expected result
- “Sync Now” no longer fails immediately with the same non-2xx message.
- A sync log is always created.
- Success/failure statuses display correctly in the UI.
- If the sync fails later, the user can see what happened and retry.


Fix the detail page query, not permissions.

What’s happening:
- The run is not failing because of RLS.
- The console error shows the real cause: `column buses_2.capacity does not exist`
- In `src/pages/SpecialUseRunDetail.tsx`, the detail query selects:
  ```tsx
  bus:buses(
    id,
    bus_number,
    capacity
  )
  ```
- But the `buses` table in `src/integrations/supabase/types.ts` only has:
  `id, bus_number, driver_first_name, driver_last_name, school_id, status, created_at, updated_at`
- So the query crashes before the page can load anything.

What should be shown on this page:
- The selected Special Use Run’s details:
  - run name + date
  - status
  - group
  - academic year
  - schedule/timeline
  - notes
  - assigned buses
  - managers
  - student roster
  - event history
- The page structure already exists; it just fails during data fetch.

Plan:
1. Update `src/pages/SpecialUseRunDetail.tsx` to stop requesting `capacity` from `buses`.
2. Adjust the Assigned Buses card so it only shows fields that actually exist, such as:
   - `Bus {bus_number}`
   - optionally driver name if useful
   - remove the `Capacity:` line unless that data should come from `special_use_run_buses.capacity`
3. If bus capacity is meant to be shown for a run assignment, switch the UI to read it from `special_use_run_buses.capacity` instead of `buses.capacity`.
4. Keep the existing route and permissions logic unchanged, because the current failure is a broken query, not an access issue.
5. Verify the full “View Details” flow end-to-end:
   - from Special Runs listing
   - into detail page
   - for scheduled and cancelled runs if available

Technical note:
- If your intended design is “anyone who can see the Special Runs admin listing can also see run details,” I’ll also review the detail page’s fallback messaging after the query fix so it doesn’t misleadingly imply a permission problem when the fetch actually errors.

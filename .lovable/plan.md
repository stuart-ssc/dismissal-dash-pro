

# Daily IC Sync Between 10AM-2PM School Time

## Current State
- The `ic-sync-scheduler` cron job runs at 2 AM UTC daily
- The scheduler calls two missing database functions (`should_sync_now` and `calculate_next_sync_time`) and references a missing table (`ic_sync_configuration`), so **every scheduled sync currently fails**
- There's no holidays/calendar table to skip non-school days

## Plan

### 1. Create `ic_sync_configuration` table + `should_sync_now` function (Migration)
- Create `ic_sync_configuration` with columns: `school_id`, `enabled` (default true), `sync_window_start` (default `10:00`), `sync_window_end` (default `14:00`), `skip_weekends` (default true), `last_sync_at`, `next_scheduled_sync_at`
- Seed a row for school 103090 with defaults
- Create `should_sync_now(p_school_id)` function that:
  - Checks the school's timezone (from `schools` table)
  - Converts current UTC time to school local time
  - Returns true only if: enabled, current local time is within the sync window, it's a weekday (Mon-Fri), and no successful sync has been logged today
- Create `calculate_next_sync_time(p_school_id)` function that returns the next valid sync timestamp (next weekday at `sync_window_start` in the school's timezone)

### 2. Update cron schedule
- Change cron from `0 2 * * *` to `0 * * * *` (every hour) so it can catch each school's 10AM-2PM local window regardless of timezone
- The `should_sync_now` function handles the actual filtering, so schools only sync once per day within their window

### 3. Simplify the scheduler edge function
- Remove the now-unnecessary `ic_sync_configuration` select for `syncConfig` (the function already has defaults)
- The `should_sync_now` and `calculate_next_sync_time` RPCs will now exist and work correctly

## Technical Details

**`should_sync_now` logic:**
```text
1. Look up school timezone from schools table
2. Convert now() to school local time
3. Check: is it a weekday? (DOW 1-5)
4. Check: is local time between sync_window_start and sync_window_end?
5. Check: has a successful sync already completed today (local date)?
6. Return true only if weekday + in window + not yet synced today
```

**Cron change:** The cron fires hourly. For an Eastern school (UTC-4), 10AM ET = 2PM UTC, so the hourly cron at 14:00 UTC would trigger it. The `should_sync_now` function ensures only one sync per day.

## Files
- **New migration** — create `ic_sync_configuration` table, `should_sync_now` function, `calculate_next_sync_time` function, update cron schedule
- **`supabase/functions/ic-sync-scheduler/index.ts`** — simplify to use the new functions properly


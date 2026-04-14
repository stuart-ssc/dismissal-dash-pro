

# Fix Data Quality Calculation Function

## Problem
The `calculate_ic_data_quality` database function crashes because it filters classes with `WHERE status = 'active'`, but the `classes` table has no `status` column. It uses `is_hidden` (boolean) instead. When the RPC call fails, the UI defaults to grade "F" with zeroed metrics.

## Solution

### Database migration: Fix the class filter in `calculate_ic_data_quality`
- Replace `WHERE school_id = p_school_id AND status = 'active'` with `WHERE school_id = p_school_id AND is_hidden = false`
- This is the only change needed — student and teacher queries use `archived = false` which is correct

## File
- **New migration** — `CREATE OR REPLACE FUNCTION` for `calculate_ic_data_quality` with the corrected filter




# Backfill Group Managers from Source Classes

## Problem
The 35 groups converted from IC-imported classes at school 103090 have 0 managers assigned. The `convert_classes_to_groups` RPC was just updated to carry over teachers as managers, but the existing groups were converted before that fix.

## Solution

### Database migration: Backfill managers for already-converted groups
Write a one-time migration that:
1. Identifies each group's source class using exact student roster matching (every student in the group is in the class and vice versa)
2. For each matched pair, inserts the class's teachers into `special_use_group_managers`
3. Uses `ON CONFLICT DO NOTHING` to be safe and idempotent
4. Logs the backfill in `audit_logs`

This approach works because the conversion copied students exactly from `class_rosters` to `special_use_group_students`, so an exact bidirectional match reliably identifies the source class.

### Technical detail
The migration runs a single INSERT that joins:
- `special_use_groups` (groups with no managers)
- `classes` (hidden classes in same school/session)
- Student set equality check (bidirectional NOT EXISTS)
- `class_teachers` for the matched source class

No frontend changes needed — the RPC and UI were already updated in the previous change.

## File
- **New migration** — backfill `special_use_group_managers` from matched source classes


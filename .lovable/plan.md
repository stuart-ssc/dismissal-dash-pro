

# Remove Student Contact/Parent Metrics from Data Quality Score

## Problem
The data quality algorithm penalizes schools 15% (each) for `students_missing_contact_info` and `students_missing_parent_name`. These fields are:
- Not populated by Infinite Campus sync (OneRoster doesn't provide parent contact details)
- Only populated via manual CSV import
- Irrelevant for evaluating IC data quality

This costs 15 points out of 100, guaranteeing no IC-synced school can score above ~85%.

## Solution

### 1. Database migration: Rebalance student weights to exclude contact/parent
Update `calculate_ic_data_quality` to set contact info and parent name weights to **0%**, redistributing to the metrics that actually matter for IC data:

**Students (50pts) — new weights:**
- Contact info: **0%** (was 15%)
- Parent name: **0%** (was 15%)
- IC linked: **50%** (was 35%)
- Enrolled in classes: **50%** (was 35%)

Teacher and class weights remain unchanged.

### 2. UI: Hide zero-weight metrics from the dashboard
In `ICDataQualityTab.tsx`, remove the "With contact info" progress bar from the Student Data Health card since it's no longer scored.

### Estimated new score for school 103090
- Students: (1 - 0×0.50 - 0.01×0.50) × 50 ≈ 49.75
- Teachers: ~25.7 (unchanged)
- Classes: ~6.0 (unchanged)
- **Total ≈ 81.5% → Grade B**

## Files
- **New migration** — `CREATE OR REPLACE FUNCTION` with updated student weights
- **`src/components/ic/ICDataQualityTab.tsx`** — remove contact info and parent name progress bars from student card


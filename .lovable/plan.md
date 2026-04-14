

# Rebalance Data Quality Scoring Algorithm

## Current breakdown (52.29% = F)
| Category (max weight) | Sub-metric | % missing | Points lost |
|---|---|---|---|
| Students (50pts) | Contact info (25%) | 100% | 12.5 |
| Students (50pts) | Parent name (25%) | 100% | 12.5 |
| Students (50pts) | IC linked (25%) | 0% | 0 |
| Students (50pts) | In classes (25%) | 1% | 0.1 |
| Teachers (30pts) | Email (25%) | 0% | 0 |
| Teachers (30pts) | IC linked (25%) | 0% | 0 |
| Teachers (30pts) | In classes (25%) | 14% | 1.1 |
| Teachers (30pts) | Has account (25%) | 100% | 7.5 |
| Classes (20pts) | Has teachers (50%) | 70% | 7.0 |
| Classes (20pts) | Has students (50%) | 70% | 7.0 |

## Proposed changes

### 1. Reduce "classes without teachers" weight
Change from 50/50 split to 20/80 (teachers/students). Many IC-imported classes are sections that naturally lack a direct teacher assignment.

### 2. Reduce "teachers without accounts" weight
Pre-invitation, 100% of teachers lack accounts — this is expected during setup. Change from 25% to 10% weight within teacher metrics.

### 3. Reduce "student contact info / parent name" weight
IC imports often don't include parent contact details. Reduce each from 25% to 15%, and increase IC-linked and enrolled-in-classes weights.

### Proposed new weights

**Students (50pts):**
- Contact info: 15% (was 25%)
- Parent name: 15% (was 25%)
- IC linked: 35% (was 25%)
- Enrolled in classes: 35% (was 25%)

**Teachers (30pts):**
- Email: 30% (was 25%)
- IC linked: 30% (was 25%)
- In classes: 30% (was 25%)
- Has account: 10% (was 25%)

**Classes (20pts):**
- Has teachers: 20% (was 50%)
- Has students: 80% (was 50%)

### Estimated new score for school 103090
- Students: (1 - 1.0×0.15 - 1.0×0.15 - 0×0.35 - 0.01×0.35) × 50 ≈ 34.8
- Teachers: (1 - 0 - 0 - 0.14×0.30 - 1.0×0.10) × 30 ≈ 25.7
- Classes: (1 - 0.70×0.20 - 0.70×0.80) × 20 ≈ 6.0
- **Total ≈ 66.5% → Grade D**

This better reflects the reality that IC data is structurally complete (students linked, teachers have emails) even when optional fields like parent contact and account activation are pending.

## File
- **New migration** — `CREATE OR REPLACE FUNCTION` for `calculate_ic_data_quality` with rebalanced weights


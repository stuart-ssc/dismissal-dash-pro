# District State Mismatch Fix - Comprehensive Plan

## Problem Statement

**Scope**: 3,590 schools are assigned to districts where the district's `state` field does not match the school's `state` field.

**Root Cause**: Initial migration merged schools from different states into single district records when district names were identical (e.g., "Fayette County" exists in AL, GA, KY, etc.).

**Impact**: 
- District filters show incorrect results
- Schools cannot find their correct district
- Data integrity violations across state boundaries

---

## Solution Overview

### Core Principles
1. **Preserve district names** - Do NOT add state suffixes to `district_name` in database
2. **Split multi-state districts** - Create separate district records for each state
3. **Update UI only** - Display "District Name (State)" format in all selectors
4. **Maintain data integrity** - Preserve all relationships, billing, and historical data

### Migration Strategy
- **Phase 1**: Identify and analyze all mismatched districts
- **Phase 2**: Execute SQL migration to split districts and reassign schools
- **Phase 3**: Update UI components to display state information
- **Phase 4**: Validate data integrity and test thoroughly

---

## Phase 1: Analysis & Preparation

### 1.1 Identify All Mismatched Districts

```sql
-- Query to find all districts with state mismatches
WITH district_states AS (
  SELECT 
    d.id as district_id,
    d.district_name,
    d.state as district_state,
    s.state as school_state,
    COUNT(s.id) as school_count
  FROM districts d
  INNER JOIN schools s ON s.district_id = d.id
  WHERE d.state != s.state
  GROUP BY d.id, d.district_name, d.state, s.state
)
SELECT 
  district_id,
  district_name,
  district_state,
  STRING_AGG(DISTINCT school_state || ' (' || school_count || ' schools)', ', ') as states_with_schools
FROM district_states
GROUP BY district_id, district_name, district_state
ORDER BY district_name;
```

### 1.2 Create Migration Plan Report

Export results to CSV for review:
- District ID
- District Name
- Current State in Districts Table
- Actual States from Schools
- Number of schools per state
- Action required (split vs update)

---

## Phase 2: SQL Migration

### 2.1 Backup Current State

```sql
-- Create backup tables before migration
CREATE TABLE districts_backup_20250122 AS SELECT * FROM districts;
CREATE TABLE schools_backup_20250122 AS SELECT * FROM schools;
CREATE TABLE user_districts_backup_20250122 AS SELECT * FROM user_districts;
```

### 2.2 Migration Script Logic

```sql
-- Step 1: For each mismatched district, create new district records per state
DO $$
DECLARE
  district_rec RECORD;
  school_state_rec RECORD;
  new_district_id uuid;
  correct_state text;
BEGIN
  -- Loop through all mismatched districts
  FOR district_rec IN 
    SELECT DISTINCT d.id, d.district_name, d.state
    FROM districts d
    INNER JOIN schools s ON s.district_id = d.id
    WHERE d.state != s.state
  LOOP
    RAISE NOTICE 'Processing district: % (ID: %)', district_rec.district_name, district_rec.id;
    
    -- Find all unique states that have schools in this district
    FOR school_state_rec IN
      SELECT DISTINCT s.state, COUNT(s.id) as school_count
      FROM schools s
      WHERE s.district_id = district_rec.id
      AND s.state != district_rec.state
      GROUP BY s.state
    LOOP
      RAISE NOTICE '  Creating new district for state: % (% schools)', 
        school_state_rec.state, school_state_rec.school_count;
      
      -- Create new district record for this state
      INSERT INTO districts (
        district_name,
        state,
        city,
        street_address,
        zipcode,
        phone_number,
        email,
        website,
        timezone,
        allow_school_colors_override,
        allow_school_dismissal_time_override,
        allow_school_timezone_override,
        created_at,
        created_by
      )
      SELECT 
        district_name,
        school_state_rec.state, -- Use the school's state
        city,
        street_address,
        zipcode,
        phone_number,
        email,
        website,
        timezone,
        allow_school_colors_override,
        allow_school_dismissal_time_override,
        allow_school_timezone_override,
        NOW(),
        created_by
      FROM districts
      WHERE id = district_rec.id
      RETURNING id INTO new_district_id;
      
      -- Update schools to point to new district
      UPDATE schools
      SET district_id = new_district_id
      WHERE district_id = district_rec.id
      AND state = school_state_rec.state;
      
      RAISE NOTICE '  Updated % schools to new district ID: %', 
        school_state_rec.school_count, new_district_id;
    END LOOP;
    
    -- Update the original district to match remaining schools' state
    correct_state := (
      SELECT s.state 
      FROM schools s 
      WHERE s.district_id = district_rec.id 
      LIMIT 1
    );
    
    IF correct_state IS NOT NULL THEN
      UPDATE districts
      SET state = correct_state
      WHERE id = district_rec.id;
      
      RAISE NOTICE '  Updated original district state to: %', correct_state;
    END IF;
  END LOOP;
END $$;
```

### 2.3 Handle User-District Relationships

```sql
-- Update user_districts for district admins assigned to split districts
-- This ensures district admins maintain access to all state-specific versions

DO $$
DECLARE
  user_district_rec RECORD;
  new_district_rec RECORD;
BEGIN
  -- For each user assigned to a split district
  FOR user_district_rec IN
    SELECT DISTINCT ud.user_id, ud.district_id, d.district_name
    FROM user_districts ud
    INNER JOIN districts d ON d.id = ud.district_id
    WHERE EXISTS (
      -- Check if this district has been split (multiple districts with same name)
      SELECT 1 
      FROM districts d2 
      WHERE d2.district_name = d.district_name 
      AND d2.id != d.id
    )
  LOOP
    -- Assign user to all state versions of this district
    FOR new_district_rec IN
      SELECT id
      FROM districts
      WHERE district_name = user_district_rec.district_name
      AND id != user_district_rec.district_id
    LOOP
      INSERT INTO user_districts (user_id, district_id, is_primary)
      VALUES (
        user_district_rec.user_id,
        new_district_rec.id,
        false -- Only original assignment is primary
      )
      ON CONFLICT (user_id, district_id) DO NOTHING;
      
      RAISE NOTICE 'Assigned user % to additional district %', 
        user_district_rec.user_id, new_district_rec.id;
    END LOOP;
  END LOOP;
END $$;
```

### 2.4 Clean Up Empty Districts

```sql
-- Delete districts with no schools assigned (duplicate empty records)
DELETE FROM districts
WHERE id IN (
  SELECT d.id
  FROM districts d
  LEFT JOIN schools s ON s.district_id = d.id
  WHERE s.id IS NULL
  AND EXISTS (
    -- Only delete if another district with same name has schools
    SELECT 1 
    FROM districts d2 
    INNER JOIN schools s2 ON s2.district_id = d2.id
    WHERE d2.district_name = d.district_name
  )
);
```

---

## Phase 3: UI Component Updates

### 3.1 Components Requiring Updates

Based on codebase search, the following components use district selectors:

1. **System Admin - Schools Page** (`src/pages/admin/Schools.tsx`)
   - District filter dropdown in filters section
   - District selector in SchoolForm dialog

2. **District Admin Components**
   - `src/components/DistrictSchoolSwitcher.tsx` - School switcher in district admin header
   - `src/components/SystemAdminSchoolSwitcher.tsx` - School switcher for system admin
   - `src/pages/district/Schools.tsx` - District schools management
   - `src/pages/district/Settings.tsx` - District settings page

3. **District Selection Hooks**
   - `src/hooks/useDistrictSchools.ts` - District schools data fetching

### 3.2 UI Display Pattern

**Standard Display Format**: `{district_name} ({state})`

**Example Implementation**:

```tsx
// Before
<SelectItem value={district.id}>{district.district_name}</SelectItem>

// After
<SelectItem value={district.id}>
  {district.district_name} ({district.state})
</SelectItem>
```

### 3.3 Specific Component Changes

#### A. System Admin Schools Page Filter

**File**: `src/pages/admin/Schools.tsx`

```tsx
// Update district filter dropdown
<Select value={selectedDistrict || ''} onValueChange={setSelectedDistrict}>
  <SelectTrigger className="w-full sm:w-[200px]">
    <SelectValue placeholder="All Districts" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Districts</SelectItem>
    {districts?.map((d) => (
      <SelectItem key={d.id} value={d.id}>
        {d.district_name} ({d.state})
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### B. School Form District Selector

**File**: `src/pages/admin/Schools.tsx` (SchoolForm component)

```tsx
<FormField
  control={form.control}
  name="districtId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>District</FormLabel>
      <Select onValueChange={field.onChange} value={field.value || ''}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select a district" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="">No District</SelectItem>
          {districts?.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.district_name} ({d.state})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

#### C. District School Switcher

**File**: `src/components/DistrictSchoolSwitcher.tsx`

```tsx
<SelectContent className="z-[60] bg-background">
  <SelectItem key="none" value="__none__">All Schools</SelectItem>
  {districtSchools.map((school) => (
    <SelectItem key={school.id} value={String(school.id)}>
      {school.school_name}
      {school.city && school.state && (
        <span className="text-muted-foreground text-xs ml-2">
          {school.city}, {school.state}
        </span>
      )}
    </SelectItem>
  ))}
</SelectContent>
```

#### D. District Settings Page

**File**: `src/pages/district/Settings.tsx`

Display district name with state in page heading:

```tsx
<div className="mb-6">
  <h1 className="text-3xl font-bold">
    {district?.district_name} ({district?.state})
  </h1>
  <p className="text-muted-foreground">District Settings</p>
</div>
```

### 3.4 Search/Autocomplete Pattern

For components with search functionality (2+ character minimum):

```tsx
const searchDistricts = async (query: string) => {
  if (query.length < 2) return;
  
  const { data } = await supabase
    .from('districts')
    .select('id, district_name, state')
    .ilike('district_name', `%${query}%`)
    .order('district_name')
    .limit(100);
  
  return data;
};

// Display in results
{districts.map((d) => (
  <div key={d.id}>
    {d.district_name} ({d.state})
  </div>
))}
```

---

## Phase 4: Validation & Testing

### 4.1 Data Integrity Validation

```sql
-- Verify no state mismatches remain
SELECT COUNT(*) as mismatch_count
FROM districts d
INNER JOIN schools s ON s.district_id = d.id
WHERE d.state != s.state;
-- Expected result: 0

-- Verify all schools are still assigned to districts
SELECT COUNT(*) as unassigned_schools
FROM schools
WHERE district_id IS NULL
AND school_district IS NOT NULL;
-- Expected result: 0 (or very low)

-- Verify district names are preserved (no state suffixes)
SELECT district_name
FROM districts
WHERE district_name LIKE '%(%';
-- Expected result: 0 rows

-- Check for duplicate district names in same state
SELECT district_name, state, COUNT(*) as count
FROM districts
GROUP BY district_name, state
HAVING COUNT(*) > 1;
-- Expected result: 0 rows (or review manually)
```

### 4.2 UI Testing Checklist

- [ ] System Admin Schools page - District filter shows state
- [ ] System Admin Schools page - SchoolForm district selector shows state
- [ ] District Admin Dashboard - Header shows district with state
- [ ] District Admin Settings - Page heading shows district with state
- [ ] District Admin Schools page - Displays correctly
- [ ] All district dropdowns are sorted alphabetically
- [ ] Search functionality works with district names
- [ ] Mobile responsive views still work correctly

### 4.3 Functional Testing

Test with specific examples:
1. **Fayette County** - Verify AL, GA, KY versions are separate
2. **Scott County** - Verify KS, KY versions are separate
3. **Madison County** - Verify all state versions work independently
4. **District Admin Access** - Verify admins see correct schools for their state
5. **School Assignment** - Create test school and assign to correct state district

---

## Phase 5: Deployment

### 5.1 Pre-Deployment Checklist

- [ ] Full database backup completed
- [ ] Migration SQL script tested on staging environment
- [ ] UI changes tested on staging environment
- [ ] Rollback plan documented and tested
- [ ] Stakeholders notified of maintenance window

### 5.2 Deployment Steps

1. **Announce maintenance window** (estimated 30-60 minutes)
2. **Create production backup**
3. **Run Phase 2 migration scripts** in order:
   - 2.1 Backup tables
   - 2.2 Split districts and reassign schools
   - 2.3 Update user-district relationships
   - 2.4 Clean up empty districts
4. **Run Phase 4.1 validation queries**
5. **Deploy UI changes** (Phase 3)
6. **Run Phase 4.2 UI testing**
7. **Monitor for errors** for 24 hours

### 5.3 Rollback Plan

If critical issues are discovered:

```sql
-- Restore from backup tables
BEGIN;

DELETE FROM districts WHERE created_at > '2025-01-22 00:00:00';
DELETE FROM user_districts WHERE created_at > '2025-01-22 00:00:00';

INSERT INTO districts SELECT * FROM districts_backup_20250122;
UPDATE schools SET district_id = b.district_id 
FROM schools_backup_20250122 b 
WHERE schools.id = b.id;
INSERT INTO user_districts SELECT * FROM user_districts_backup_20250122;

COMMIT;
```

---

## Risk Assessment

### High Risk
- **Data loss during migration** → Mitigated by comprehensive backups
- **User-district relationship breaks** → Mitigated by Phase 2.3 logic

### Medium Risk
- **Performance impact during migration** → Schedule during low-usage window
- **UI rendering issues** → Thoroughly test on staging first

### Low Risk
- **Minor display inconsistencies** → Easy to fix post-deployment
- **Missing edge cases** → Validation queries catch most issues

---

## Post-Deployment Monitoring

### Week 1
- Monitor error logs for district-related queries
- Track user support tickets related to districts
- Review audit logs for district admin activity

### Week 2-4
- Verify data quality metrics
- Confirm no new state mismatches introduced
- User feedback survey

---

## Success Criteria

✅ **Data Integrity**
- Zero state mismatches between districts and schools
- All 3,590 affected schools correctly assigned
- No data loss or corruption

✅ **Functionality**
- District filters work correctly by state
- School assignments accurate
- District admin access preserved

✅ **User Experience**
- District selectors show state information
- Intuitive UI (District Name (State) format)
- No performance degradation

---

## Estimated Timeline

- **Phase 1 (Analysis)**: 1-2 days
- **Phase 2 (Migration Development)**: 2-3 days
- **Phase 3 (UI Updates)**: 1-2 days
- **Phase 4 (Testing)**: 2-3 days
- **Phase 5 (Deployment)**: 1 day

**Total Estimated Time**: 7-11 business days

---

## Notes

- Preserve `district_name` field exactly as-is for billing and contracts
- Display state in UI only, not in database
- This fix is a one-time migration, not a recurring process
- Future district creation should enforce state matching from the start

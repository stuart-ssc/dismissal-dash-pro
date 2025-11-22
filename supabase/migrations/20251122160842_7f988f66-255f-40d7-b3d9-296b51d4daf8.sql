-- ============================================
-- DISTRICT STATE MISMATCH FIX MIGRATION (CORRECTED)
-- ============================================
-- This migration splits multi-state districts into state-specific records
-- and reassigns schools to their correct state-matched districts.
--
-- IMPORTANT: This migration is idempotent and can be run multiple times safely.
-- It uses temporary backup tables for rollback capability.
-- ============================================

-- STEP 1: Create backup tables for rollback capability
-- =====================================================

-- Backup districts table
DROP TABLE IF EXISTS districts_backup_pre_split;
CREATE TABLE districts_backup_pre_split AS 
SELECT * FROM districts;

-- Backup schools table (only district_id column since that's what we're changing)
DROP TABLE IF EXISTS schools_backup_pre_split;
CREATE TABLE schools_backup_pre_split AS 
SELECT id, district_id FROM schools;

-- Backup user_districts table
DROP TABLE IF EXISTS user_districts_backup_pre_split;
CREATE TABLE user_districts_backup_pre_split AS 
SELECT * FROM user_districts;

-- STEP 2: Split multi-state districts into state-specific records
-- ================================================================

-- For each district that has schools in multiple states:
-- 1. Keep the original district record for the first state
-- 2. Create new district records for additional states
-- 3. New records preserve all district data except get new UUIDs

DO $$
DECLARE
  district_rec RECORD;
  state_rec RECORD;
  first_state TEXT;
  new_district_id UUID;
  is_first BOOLEAN;
BEGIN
  -- Loop through all districts that have schools with mismatched states
  FOR district_rec IN 
    SELECT DISTINCT d.id, d.district_name, d.state as district_state
    FROM districts d
    INNER JOIN schools s ON s.district_id = d.id
    WHERE s.state IS NOT NULL
      AND s.state != ''
      AND (d.state IS NULL OR d.state != s.state)
  LOOP
    RAISE NOTICE 'Processing district: % (ID: %)', district_rec.district_name, district_rec.id;
    
    -- Get all unique states for this district's schools
    is_first := TRUE;
    first_state := NULL;
    
    FOR state_rec IN 
      SELECT DISTINCT s.state
      FROM schools s
      WHERE s.district_id = district_rec.id
        AND s.state IS NOT NULL
        AND s.state != ''
      ORDER BY s.state
    LOOP
      IF is_first THEN
        -- First state: Update the original district record with this state
        first_state := state_rec.state;
        UPDATE districts 
        SET state = state_rec.state,
            updated_at = NOW()
        WHERE id = district_rec.id;
        
        RAISE NOTICE '  - Updated original district to state: %', state_rec.state;
        is_first := FALSE;
      ELSE
        -- Additional states: Create new district records
        new_district_id := gen_random_uuid();
        
        INSERT INTO districts (
          id, district_name, street_address, city, state, zipcode,
          phone_number, email, website, timezone,
          allow_school_timezone_override, allow_school_dismissal_time_override,
          allow_school_colors_override, created_at, updated_at, created_by
        )
        SELECT 
          new_district_id,
          district_name,
          street_address,
          city,
          state_rec.state, -- Use the school's state
          zipcode,
          phone_number,
          email,
          website,
          timezone,
          allow_school_timezone_override,
          allow_school_dismissal_time_override,
          allow_school_colors_override,
          NOW(),
          NOW(),
          created_by
        FROM districts
        WHERE id = district_rec.id;
        
        -- Reassign schools from this state to the new district
        UPDATE schools
        SET district_id = new_district_id
        WHERE district_id = district_rec.id
          AND state = state_rec.state;
          
        -- Migrate user_districts relationships
        -- Copy all user associations from old district to new district
        INSERT INTO user_districts (user_id, district_id, is_primary, created_at, updated_at)
        SELECT user_id, new_district_id, is_primary, NOW(), NOW()
        FROM user_districts
        WHERE district_id = district_rec.id
        ON CONFLICT (user_id, district_id) DO NOTHING;
        
        RAISE NOTICE '  - Created new district (ID: %) for state: %', new_district_id, state_rec.state;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- STEP 3: Clean up - Delete districts with no schools
-- ====================================================

DELETE FROM districts
WHERE id NOT IN (SELECT DISTINCT district_id FROM schools WHERE district_id IS NOT NULL);

-- STEP 4: Validation - Verify zero state mismatches remain
-- =========================================================

DO $$
DECLARE
  mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO mismatch_count
  FROM schools s
  INNER JOIN districts d ON d.id = s.district_id
  WHERE s.state IS NOT NULL 
    AND s.state != ''
    AND d.state IS NOT NULL
    AND s.state != d.state;
    
  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % schools still have state mismatches', mismatch_count;
  ELSE
    RAISE NOTICE 'SUCCESS: Zero state mismatches remain after migration';
  END IF;
END $$;

-- ============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================
-- To rollback this migration, run:
--
-- BEGIN;
-- TRUNCATE districts CASCADE;
-- INSERT INTO districts SELECT * FROM districts_backup_pre_split;
-- UPDATE schools s SET district_id = b.district_id 
-- FROM schools_backup_pre_split b WHERE s.id = b.id;
-- TRUNCATE user_districts CASCADE;
-- INSERT INTO user_districts SELECT * FROM user_districts_backup_pre_split;
-- COMMIT;
--
-- DROP TABLE districts_backup_pre_split;
-- DROP TABLE schools_backup_pre_split;
-- DROP TABLE user_districts_backup_pre_split;
-- ============================================
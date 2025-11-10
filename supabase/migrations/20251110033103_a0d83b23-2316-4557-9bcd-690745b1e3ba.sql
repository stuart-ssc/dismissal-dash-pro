-- Fix Ian Camp's account association with Stuart Test IC school
-- This is a one-time data fix for an account created before the user_schools association was added

-- 1. Create the user_schools association (the critical fix)
INSERT INTO user_schools (user_id, school_id, is_primary)
VALUES ('7d42d318-cbd3-44cb-b9ff-09e17895f270', 106151, true);

-- 2. Update the profile.school_id for consistency
UPDATE profiles 
SET school_id = 106151
WHERE id = '7d42d318-cbd3-44cb-b9ff-09e17895f270';
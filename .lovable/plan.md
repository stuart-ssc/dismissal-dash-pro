

## Fix: School Not Associated on Signup

### Root Cause

Two bugs prevent school association during email signup:

1. **Metadata key mismatch**: `signUp()` sends `school_id` (snake_case) but the `handle_new_user` DB trigger reads `schoolId` (camelCase). Result: `profiles.school_id` is always NULL for new signups.

2. **Missing RLS policy**: The client tries to insert into `user_schools` after signup, but there's no INSERT policy allowing a new user to add their own school association. The insert silently fails.

### Fix Plan

#### 1. Fix the metadata key in `useAuth.tsx`

Change line 322 from `school_id: schoolId` to `schoolId: schoolId` so the trigger can read it correctly. This single change fixes `profiles.school_id` being set by the trigger.

#### 2. Add INSERT RLS policy on `user_schools`

Create a migration adding a policy that allows authenticated users to insert their own school association:

```sql
CREATE POLICY "Users can insert their own school associations"
ON public.user_schools
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

#### 3. Fix existing user data

Run a one-time data fix for `stuart@stokedember.com` to set `profiles.school_id` and create the `user_schools` entry for East Jessamine Middle School.

### Files Modified
- `src/hooks/useAuth.tsx` -- Fix metadata key from `school_id` to `schoolId`
- New migration -- Add INSERT policy on `user_schools`
- One-time migration -- Fix Stuart's profile data


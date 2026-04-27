-- This migration fixes RLS policy issues for admin functions
-- Run this if get_all_users_for_admin() is still failing

-- First, check what RLS policies exist on profiles table
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Create or update RLS policy to allow admin role to bypass restrictions
-- If there's an existing policy that restricts users to their own rows,
-- we need to add an exception for admins

-- Option 1: If you have a policy that says "users can only see their own row",
-- update it to also allow admins to see all rows:

ALTER POLICY "Users can manage own profile" ON profiles
USING (
  auth.uid() = id
  OR (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true))
)
WITH CHECK (auth.uid() = id);

-- Option 2: If the above policy doesn't exist, create a policy that allows admins:
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT
USING (
  auth.uid() = id
  OR (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true))
);

# SQL Migrations for Admin Panel

Run these SQL commands in your Supabase SQL Editor to enable all admin panel features.

## Required Migrations

### 1. Add User Activity Tracking Columns

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Set all existing users to onboarded = true
UPDATE profiles SET onboarded = TRUE;
```

### 2. Create Function to Get All Users (Including Unverified)

```sql
-- Create a function to get all users (including unverified emails)
CREATE OR REPLACE FUNCTION get_all_users_with_profiles()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER,
  email_confirmed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    COALESCE(p.full_name, au.user_metadata->>'full_name') as full_name,
    au.email,
    COALESCE(p.currency, 'N/A') as currency,
    au.created_at,
    p.last_login_at,
    COALESCE(p.login_count, 0) as login_count,
    au.email_confirmed_at IS NOT NULL as email_confirmed
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## How to Run

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste **Migration 1** above
5. Click **Run**
6. Wait for completion
7. Create another **New Query**
8. Copy and paste **Migration 2** above
9. Click **Run**
10. Wait for completion

## What These Migrations Do

- **Migration 1**: Adds columns for tracking user activity and onboarding status
- **Migration 2**: Creates a PostgreSQL function that joins auth.users with profiles to show ALL users (including those with unverified emails)

## Admin Panel Features After Migration

✅ View all users including unverified emails
✅ See email verification status (green = verified, yellow = unverified)
✅ Track login count and last login time
✅ Search and sort users
✅ View app statistics

---

**Status**: Required for admin panel to work with unverified users

# Supabase Admin Setup Instructions

## Required SQL Migration for Admin Panel

The admin panel requires special Postgres functions to bypass Row-Level Security (RLS) policies and allow admins to view all user data.

### Steps to Apply the Migration:

1. **Open Supabase SQL Editor**
   - Go to: https://app.supabase.com/project/_/sql/new
   - Select your FinArt project

2. **Copy and Run the SQL Migration**
   - Copy the contents of `supabase/migrations/20260427_add_get_all_users_for_admin.sql`
   - Paste the entire SQL into the Supabase SQL editor
   - Click "Run" to execute

3. **What the Migration Does:**
   - Creates `get_all_users_for_admin()` function - allows admins to retrieve all user profiles
   - Creates `get_app_statistics_for_admin()` function - allows admins to retrieve app-wide statistics
   - Both functions include admin verification - only users with `is_admin = true` can call them
   - Grants execute permission to authenticated users

### Why This is Needed:

The Supabase profiles table has Row-Level Security (RLS) policies that restrict each user to only viewing/modifying their own row. The admin panel needs to view all users, which would be blocked by the standard RLS policies.

By creating these `SECURITY DEFINER` functions, we allow:
- The functions to bypass RLS (because they run as the function creator)
- Only admins to execute them (verified inside the function logic)
- Safe, controlled access to all data without exposing the database to unauthorized users

### Testing the Setup:

After running the migration:

1. Open FinArt in your browser
2. Sign in as an admin user (any user with `is_admin = true`)
3. Navigate to `/admin` (or click Admin link in sidebar if available)
4. The Users and Statistics tabs should now load without "Failed to load data" errors

### Troubleshooting:

- **Still getting "Failed to load data"**: Ensure the SQL migration ran successfully. Check Supabase console for any SQL errors.
- **"Only admins can view all users" error**: The current user doesn't have `is_admin = true`. Verify the user's admin status in the profiles table.
- **Function not found error**: The migration didn't run completely. Try copying the SQL again and running it.

### Manual Admin Setup (if needed):

If you need to make a user an admin via SQL:

```sql
UPDATE profiles
SET is_admin = true
WHERE email = 'user@example.com';
```

Then log out and back in for the changes to take effect.

# Admin Control Panel Setup Guide

This document contains all the necessary steps to complete the admin control panel implementation for FinArt-Web.

## Overview

The admin control panel allows the super admin (alnahash@gmail.com) to:
- View all registered users with their details (name, email, currency, created date, last login, login count)
- See app-wide statistics (total users, transactions, categories, average spending, etc.)
- Monitor user activity and engagement

## Implementation Status

✅ **Completed:**
- AdminPage.tsx - Main admin dashboard component
- AdminLayout.tsx - Layout wrapper with header and navigation
- UsersList.tsx - Users table with search, sort, and pagination
- StatisticsPanel.tsx - App statistics display
- Database service functions (getAllUsers, getAppStatistics, updateLastLogin)
- /admin route added to App.tsx
- Admin panel link added to Layout (visible only to admin)
- Login tracking integration in DashboardPage

⚠️ **Required Database Changes:**
- Add `last_login_at` TIMESTAMP column to profiles table
- Add `login_count` INTEGER column to profiles table
- Add `email` TEXT column to profiles table (recommended for admin features)

## Required Database Migrations

Run these SQL commands in your Supabase SQL Editor:

### Step 1: Add User Activity Tracking Columns

```sql
-- Add last_login_at and login_count to track user activity
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
```

### Step 2: Add Email Column (Recommended)

```sql
-- Add email column to profiles for easier admin queries
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Optional: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
```

### Step 3: Update RLS Policies (Optional but Recommended)

If you want the admin to have read-only access to all user data, update your RLS policies:

```sql
-- Allow admin user to read all profiles
CREATE POLICY "admin_read_all_profiles" ON profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'alnahash@gmail.com'
  )
  WITH CHECK (false);

-- Similar policies for other tables if needed
```

## Setup Instructions

### 1. Add Database Columns

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (FinMgmt)
3. Click "SQL Editor" in the left sidebar
4. Create a new query
5. Copy and paste the SQL from "Step 1: Add User Activity Tracking Columns" above
6. Click "Run"
7. Repeat for "Step 2: Add Email Column"

### 2. Populate Email Column (If Added)

If you added the email column, populate existing user records:

```sql
-- Populate email from auth.users for existing profiles
UPDATE profiles p
SET email = (
  SELECT email FROM auth.users au WHERE au.id = p.id
)
WHERE email IS NULL;
```

### 3. Update Signup Flow (Optional)

To automatically store email in profiles during signup, you may need to update your signup trigger or RPC function. The email can be:
- Stored via auth.users metadata
- Retrieved from the auth system during profile creation
- Passed through the signUp function

### 4. Test the Admin Panel

1. Log in with the admin account (alnahash@gmail.com)
2. You should see an ⚙️ icon in the top bar of the dashboard
3. Click the ⚙️ icon to access the admin panel
4. The "Users" tab should show a list of all registered users
5. The "Statistics" tab should show app-wide statistics

## File Structure

New files created:

```
src/
├── pages/
│   └── AdminPage.tsx           # Main admin dashboard page
├── components/
│   └── admin/
│       ├── AdminLayout.tsx     # Admin layout wrapper
│       ├── UsersList.tsx       # Users table component
│       └── StatisticsPanel.tsx # Statistics display component
└── services/
    └── db.ts                   # Updated with admin functions
```

Modified files:

```
src/
├── App.tsx                      # Added /admin route
├── components/
│   └── Layout.tsx              # Added admin link (visible to admin only)
└── pages/
    └── DashboardPage.tsx       # Added login tracking
```

## Admin Functions Added to db.ts

### `getAllUsers()`
Fetches all user profiles with their activity data.

**Returns:**
```typescript
{
  id: string
  full_name: string | null
  email: string | null
  currency: string
  created_at: string
  last_login_at: string | null
  login_count: number
}[]
```

### `getAppStatistics()`
Calculates app-wide statistics including:
- Total users
- Total transactions
- Total categories
- Average spending per user
- New users this month

**Returns:**
```typescript
{
  totalUsers: number
  totalTransactions: number
  totalCategories: number
  averageSpending: number
  newUsersThisMonth: number
}
```

### `updateLastLogin(userId: string)`
Updates the last_login_at timestamp and increments login_count for a user.
Called automatically when user navigates to dashboard.

## Features

### Users Tab
- **Search**: Filter users by name or email
- **Sort**: Click column headers to sort by different fields
  - Name, Created Date, Last Login, Login Count
- **Pagination**: View 20 users per page
- **Activity Status**: Visual indicator showing when user was last active
  - Green badge: Active user
  - Gray badge: Never logged in

### Statistics Tab
- **Key Metrics**: Total users, transactions, categories, average spending
- **Quick Insights**: Summary of engagement metrics
- **Engagement**: Transaction activity and platform health indicators

## Security Notes

1. **Admin Access Control**: Only alnahash@gmail.com can access the admin panel
   - Enforced in AdminPage.tsx with email check
   - Client-side redirect if unauthorized

2. **Read-Only Access**: Admin panel only displays data, doesn't modify user records

3. **Authentication**: Requires user to be logged in via PrivateRoute

4. **RLS Policies**: Optional RLS policies can further restrict data access at database level

## Testing Checklist

- [ ] Database columns added successfully
- [ ] Admin can access /admin route
- [ ] Users table displays all registered users
- [ ] Search functionality filters users correctly
- [ ] Sort works on different columns
- [ ] Pagination works with 20 users per page
- [ ] Statistics tab shows correct calculations
- [ ] Last login timestamp updates on dashboard visit
- [ ] Login count increments on each login
- [ ] Non-admin users cannot access /admin route
- [ ] Admin link (⚙️) appears in top bar for admin only
- [ ] All dates/times format correctly

## Troubleshooting

**Issue: "Column does not exist" error**
- Solution: Run the SQL migrations from Step 1 and Step 2 in Supabase SQL Editor

**Issue: Admin panel shows "Unauthorized"**
- Solution: Verify you're logged in with alnahash@gmail.com
- Check browser console for errors
- Verify user email matches exactly (case-sensitive)

**Issue: No users showing in Users tab**
- Solution: 
  - Verify email column is populated
  - Check RLS policies don't restrict admin read access
  - Sign up a test user to see data

**Issue: Statistics showing 0 values**
- Solution:
  - Ensure test transactions exist in database
  - Check database queries in browser console
  - Verify user has permissions to read all transactions

## Next Steps

1. Run the SQL migrations in Supabase
2. Deploy the updated code
3. Log in with admin account
4. Test all admin panel features
5. Monitor user activity and app statistics

## Support

For additional customization:
- Add more metrics to StatisticsPanel.tsx
- Expand UsersList.tsx with additional filters
- Add user management features (edit, suspend, delete - use with caution!)
- Create automated reports or exports

---

**Admin Panel Setup Complete!** 🎉

The admin control panel is now ready to monitor your FinArt app's users and statistics.

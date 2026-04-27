# SQL Migrations for 2FA Implementation

Run these SQL commands in your Supabase SQL Editor to enable all 2FA features.

## Required Migrations

### Add 2FA Columns to Profiles Table

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_fa_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_fa_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS backup_codes TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_fa_created_at TIMESTAMP WITH TIME ZONE;
```

## How to Run

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the migration SQL above
5. Click **Run**
6. Wait for completion ✓

## What These Migrations Do

- **two_fa_enabled** (BOOLEAN): Whether 2FA is currently active for this user
- **two_fa_secret** (TEXT): Encrypted TOTP secret key (base32 encoded)
- **two_fa_verified** (BOOLEAN): Setup verification complete
- **backup_codes** (TEXT[]): Array of 10 one-time backup codes (stored as plain text strings)
- **two_fa_created_at** (TIMESTAMP): When 2FA was first enabled

## Status: REQUIRED for 2FA to work

Once these columns are added, the 2FA feature is fully functional:
✅ Users can enable 2FA from Settings → Security
✅ QR code scanning with authenticator apps (Google Authenticator, Microsoft Authenticator, Authy)
✅ 6-digit OTP verification during login
✅ Backup codes for account recovery
✅ Disable 2FA option from Settings

---

**Backup Codes Storage Note**: Backup codes are stored as an array of plain text strings in the `backup_codes` column. Each code is 8 characters (e.g., "ABCD1234"). In a production environment with higher security requirements, you might want to hash or encrypt these codes, but for this app they're stored plaintext for easy retrieval.

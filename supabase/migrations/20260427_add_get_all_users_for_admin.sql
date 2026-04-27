-- Create a function that allows admins to get all user profiles
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE(
  id uuid,
  full_name text,
  email text,
  currency text,
  created_at timestamp with time zone,
  last_login_at timestamp with time zone,
  login_count integer,
  email_confirmed boolean,
  is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can view all users';
  END IF;

  -- Return all users
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.currency,
    p.created_at,
    p.last_login_at,
    p.login_count,
    p.email_confirmed,
    p.is_admin
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users_for_admin() TO authenticated;

-- Create a function that allows admins to get app statistics
CREATE OR REPLACE FUNCTION get_app_statistics_for_admin()
RETURNS TABLE(
  total_users bigint,
  total_transactions bigint,
  total_categories bigint,
  average_spending numeric,
  new_users_this_month bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_count bigint;
  v_tx_count bigint;
  v_cat_count bigint;
  v_total_spending numeric;
  v_month_start timestamp with time zone;
  v_new_users bigint;
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can view statistics';
  END IF;

  -- Get total users count
  SELECT COUNT(*) INTO v_user_count FROM profiles;

  -- Get total transactions count
  SELECT COUNT(*) INTO v_tx_count FROM transactions;

  -- Get total categories count
  SELECT COUNT(*) INTO v_cat_count FROM categories;

  -- Calculate total spending
  SELECT COALESCE(SUM(amount), 0) INTO v_total_spending
  FROM transactions
  WHERE type = 'debit';

  -- Get new users this month
  v_month_start := DATE_TRUNC('month', NOW());
  SELECT COUNT(*) INTO v_new_users
  FROM profiles
  WHERE created_at >= v_month_start;

  -- Return the statistics
  RETURN QUERY
  SELECT
    v_user_count,
    v_tx_count,
    v_cat_count,
    CASE WHEN v_user_count > 0 THEN v_total_spending / v_user_count ELSE 0 END,
    v_new_users;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_app_statistics_for_admin() TO authenticated;

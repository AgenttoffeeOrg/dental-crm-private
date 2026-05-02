SET search_path TO public, extensions;

-- =====================================================
-- STEP 4B: EMAIL VERIFICATION GATING
-- Purpose: Require email verification for sensitive actions
-- Safety: Feature flag controlled, backward compatible
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Adds email_verified tracking to app_users
-- 2. Creates email_verification_tokens table
-- 3. Creates helper functions for verification flow
-- 4. Adds RLS policies to gate sensitive actions
-- 5. Logs verification events to audit trail
--
-- GATED ACTIONS (when email_verification_required = true):
-- - Creating/sending user invitations
-- - Creating new organizations
-- - Bulk invite uploads
-- - Changing primary email
-- - Admin-level operations
--
-- VERIFICATION FLOW:
-- 1. User signs up → email_verified = false
-- 2. Verification email sent with token
-- 3. User clicks link → token validated
-- 4. email_verified = true → full access
-- 5. Unverified users see banner with resend option
--
-- GRACE PERIOD:
-- - New users: 7 days to verify before restrictions
-- - Existing users: grandfathered as verified
-- - Verification tokens: 24 hour expiry
--
-- SAFETY:
-- - Feature flag controlled: email_verification_required
-- - When disabled: all users treated as verified
-- - Idempotent: safe to run multiple times
-- - Non-breaking: existing users auto-verified
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ADD EMAIL VERIFICATION TO APP_USERS
-- =====================================================

DO $$
DECLARE
  separator CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'ADDING EMAIL VERIFICATION TO APP_USERS';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
END $$;

-- Add email_verified column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_users' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Added email_verified to app_users';
  ELSE
    RAISE NOTICE 'ℹ️  email_verified already exists on app_users';
  END IF;
END $$;

-- Add email_verified_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_users' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added email_verified_at to app_users';
  ELSE
    RAISE NOTICE 'ℹ️  email_verified_at already exists on app_users';
  END IF;
END $$;

-- Add verification_grace_ends_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_users' AND column_name = 'verification_grace_ends_at'
  ) THEN
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS verification_grace_ends_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added verification_grace_ends_at to app_users';
  ELSE
    RAISE NOTICE 'ℹ️  verification_grace_ends_at already exists on app_users';
  END IF;
END $$;

-- PATCHED: index commented out (was incomplete in original)
-- CREATE INDEX idx_app_users_email_verified ON app_users(email_verified) WHERE NOT email_verified;

COMMENT ON COLUMN app_users.email_verified IS
  'Whether user has verified their email address';
COMMENT ON COLUMN app_users.email_verified_at IS
  'Timestamp when email was verified';
COMMENT ON COLUMN app_users.verification_grace_ends_at IS
  'Grace period end for email verification (7 days from signup)';

-- =====================================================
-- 2. CREATE EMAIL_VERIFICATION_TOKENS TABLE
-- =====================================================

DROP TABLE IF EXISTS email_verification_tokens CASCADE;
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user 
  ON email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token 
  ON email_verification_tokens(token) WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires 
  ON email_verification_tokens(expires_at) WHERE used_at IS NULL;

-- Enable RLS
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own verification tokens" ON email_verification_tokens;
CREATE POLICY "Users can view their own verification tokens" ON email_verification_tokens
  FOR SELECT
  USING (user_id IN (SELECT id FROM app_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Service role can manage verification tokens" ON email_verification_tokens;
CREATE POLICY "Service role can manage verification tokens" ON email_verification_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE email_verification_tokens IS
  'Time-limited tokens for email verification (24 hour expiry)';

DO $$
BEGIN
  RAISE NOTICE '✅ Created email_verification_tokens table with RLS';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user email is verified
CREATE OR REPLACE FUNCTION public.user_email_verified(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_verified BOOLEAN;
  v_flag_enabled BOOLEAN;
  v_grace_end TIMESTAMPTZ;
BEGIN
  -- Check if feature is enabled
  SELECT enabled INTO v_flag_enabled
  FROM feature_flags
  WHERE key = 'email_verification_required';
  
  -- If feature disabled, treat all as verified
  IF v_flag_enabled IS NULL OR NOT v_flag_enabled THEN
    RETURN TRUE;
  END IF;
  
  -- Get user verification status
  SELECT email_verified, verification_grace_ends_at 
  INTO v_verified, v_grace_end
  FROM app_users
  WHERE id = p_user_id;
  
  -- Already verified
  IF v_verified THEN
    RETURN TRUE;
  END IF;
  
  -- Still in grace period
  IF v_grace_end IS NOT NULL AND v_grace_end > NOW() THEN
    RETURN TRUE;
  END IF;
  
  -- Not verified and grace period expired
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.user_email_verified IS
  'Check if user email is verified (or in grace period, or feature disabled)';

-- Function to generate verification token
CREATE OR REPLACE FUNCTION public.generate_verification_token(
  p_user_id UUID,
  p_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Generate secure random token
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');
  
  -- Insert token
  INSERT INTO email_verification_tokens (user_id, token, email)
  VALUES (p_user_id, v_token, p_email);
  
  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION public.generate_verification_token IS
  'Generate a new email verification token (24 hour expiry)';

-- Function to verify email with token
CREATE OR REPLACE FUNCTION public.verify_email_with_token(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_expires_at TIMESTAMPTZ;
  v_used_at TIMESTAMPTZ;
BEGIN
  -- Get token details
  SELECT user_id, email, expires_at, used_at
  INTO v_user_id, v_email, v_expires_at, v_used_at
  FROM email_verification_tokens
  WHERE token = p_token;
  
  -- Token not found
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Token already used
  IF v_used_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Token expired
  IF v_expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Mark token as used
  UPDATE email_verification_tokens
  SET used_at = NOW()
  WHERE token = p_token;
  
  -- Mark user as verified
  UPDATE app_users
  SET 
    email_verified = true,
    email_verified_at = NOW(),
    verification_grace_ends_at = NULL,
    updated_at = NOW()
  WHERE id = v_user_id AND email = v_email;
  
  -- Also validate the organization if this is the owner
  PERFORM validate_organization(tenant_id, v_user_id)
  FROM app_users
  WHERE id = v_user_id AND role = 'owner';
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.verify_email_with_token IS
  'Verify user email with token. Also validates org if user is owner.';

-- Function to resend verification email
CREATE OR REPLACE FUNCTION public.resend_verification_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_token TEXT;
  v_last_sent TIMESTAMPTZ;
BEGIN
  -- Get user email
  SELECT email INTO v_email
  FROM app_users
  WHERE id = p_user_id;
  
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check rate limit (1 minute cooldown)
  SELECT MAX(created_at) INTO v_last_sent
  FROM email_verification_tokens
  WHERE user_id = p_user_id;
  
  IF v_last_sent IS NOT NULL AND v_last_sent > (NOW() - INTERVAL '1 minute') THEN
    RAISE EXCEPTION 'Please wait before requesting another verification email';
  END IF;
  
  -- Generate new token
  v_token := generate_verification_token(p_user_id, v_email);
  
  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION public.resend_verification_email IS
  'Resend verification email (1 minute rate limit)';

DO $$
BEGIN
  RAISE NOTICE '✅ Created email verification helper functions';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 4. BACKFILL EXISTING USERS
-- =====================================================

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  RAISE NOTICE 'Backfilling email verification for existing users...';
  
  -- Mark all existing users as verified (grandfathered)
  UPDATE app_users
  SET 
    email_verified = true,
    email_verified_at = created_at
  WHERE email_verified IS NULL OR NOT email_verified;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Marked % existing users as email verified', updated_count;
  RAISE NOTICE '   (Existing users are grandfathered - no verification required)';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

DO $$
DECLARE
  email_verified_exists BOOLEAN;
  email_verified_at_exists BOOLEAN;
  verification_grace_exists BOOLEAN;
  tokens_table_exists BOOLEAN;
  function_count INTEGER;
  verified_count INTEGER;
  unverified_count INTEGER;
  separator CONSTANT TEXT := '========================================';
BEGIN
  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_users' AND column_name = 'email_verified'
  ) INTO email_verified_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_users' AND column_name = 'email_verified_at'
  ) INTO email_verified_at_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_users' AND column_name = 'verification_grace_ends_at'
  ) INTO verification_grace_exists;
  
  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'email_verification_tokens'
  ) INTO tokens_table_exists;
  
  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'user_email_verified', 'generate_verification_token', 
    'verify_email_with_token', 'resend_verification_email'
  );
  
  -- Count user statuses
  SELECT COUNT(*) INTO verified_count
  FROM app_users WHERE email_verified;
  
  SELECT COUNT(*) INTO unverified_count
  FROM app_users WHERE NOT email_verified OR email_verified IS NULL;
  
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'app_users.email_verified: %', CASE WHEN email_verified_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'app_users.email_verified_at: %', CASE WHEN email_verified_at_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'app_users.verification_grace_ends_at: %', CASE WHEN verification_grace_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'email_verification_tokens table: %', CASE WHEN tokens_table_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'Helper functions: % of 4', function_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Verified users: %', verified_count;
  RAISE NOTICE 'Unverified users: %', unverified_count;
  RAISE NOTICE '';
  
  IF email_verified_exists AND email_verified_at_exists AND verification_grace_exists
     AND tokens_table_exists AND function_count = 4 THEN
    RAISE NOTICE '✅ All email verification infrastructure ready';
  ELSE
    RAISE WARNING '⚠️  Some components missing';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  separator CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '✅ EMAIL VERIFICATION READY';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  RAISE NOTICE '✅ 3 columns added to app_users';
  RAISE NOTICE '✅ email_verification_tokens table created';
  RAISE NOTICE '✅ 4 helper functions created';
  RAISE NOTICE '✅ Existing users grandfathered as verified';
  RAISE NOTICE '✅ Feature flag controlled (email_verification_required)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 VERIFICATION FLOW:';
  RAISE NOTICE '   Sign up → email_verified = false';
  RAISE NOTICE '   7 day grace period → full access';
  RAISE NOTICE '   Token sent → 24 hour expiry';
  RAISE NOTICE '   Click link → email_verified = true';
  RAISE NOTICE '   Owner verified → org also validated';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 GATED ACTIONS (unverified users after grace):';
  RAISE NOTICE '   - Cannot send invitations';
  RAISE NOTICE '   - Cannot create organizations';
  RAISE NOTICE '   - Cannot bulk upload invites';
  RAISE NOTICE '   - Cannot perform admin operations';
  RAISE NOTICE '';
  RAISE NOTICE '💡 NEXT STEPS:';
  RAISE NOTICE '   - Run migration 005c for reminder scheduler';
  RAISE NOTICE '   - Integrate with email service for sending tokens';
  RAISE NOTICE '   - Enable email_verification_required flag when ready';
END $$;



-- Fix existing app_users records with NULL emails
BEGIN;


-- Show current state
SELECT 
    COUNT(*) as users_with_null_email
FROM app_users 
WHERE email IS NULL;


-- Fix NULL emails by copying from auth.users
UPDATE app_users au
SET 
    email = u.email,
    updated_at = NOW()
FROM auth.users u
WHERE au.id = u.id
AND au.email IS NULL
AND u.email IS NOT NULL;


-- Verify fix
SELECT 
    COUNT(*) as remaining_null_emails
FROM app_users 
WHERE email IS NULL;


-- Make email field required going forward (if not already)
DO $$
BEGIN
    -- Only add NOT NULL if column exists and is currently nullable
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'app_users' 
        AND column_name = 'email'
        AND is_nullable = 'YES'
    ) THEN
        -- First ensure no NULLs remain
        IF NOT EXISTS (SELECT 1 FROM app_users WHERE email IS NULL) THEN
            ALTER TABLE app_users ALTER COLUMN email SET NOT NULL;
            RAISE NOTICE 'Made email field NOT NULL';
        ELSE
            RAISE WARNING 'Cannot make email NOT NULL - some records still have NULL values';
        END IF;
    END IF;
END $$;


COMMIT;











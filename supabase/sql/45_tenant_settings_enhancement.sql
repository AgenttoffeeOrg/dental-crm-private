-- =====================================================
-- TENANT SETTINGS ENHANCEMENT
-- =====================================================
-- Add all missing columns to support complete settings
-- =====================================================

BEGIN;

-- Add company/practice information columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email TEXT;

-- Address columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States';

-- Regional settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12h';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS week_start TEXT DEFAULT 'monday';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS fiscal_year_start TEXT DEFAULT 'january';

-- Branding
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#667eea';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#764ba2';

-- Business info
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_hours_start TEXT DEFAULT '09:00';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_hours_end TEXT DEFAULT '17:00';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday'];

-- Communication defaults
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_email_from_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_email_from_address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_email_reply_to TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_from_number TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT;

-- Integration settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_host TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_port INTEGER;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_username TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_password TEXT; -- Encrypted
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS smtp_encryption TEXT DEFAULT 'tls';

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_provider TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_api_key TEXT; -- Encrypted
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_api_secret TEXT; -- Encrypted

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_api_key TEXT; -- Encrypted
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_api_secret TEXT; -- Encrypted

-- Notification preferences
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enable_sms_notifications BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enable_slack_notifications BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;

-- Data & privacy
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 365;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gdpr_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_delete_enabled BOOLEAN DEFAULT FALSE;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Tenant settings columns added successfully!';
  RAISE NOTICE '   - Company information fields';
  RAISE NOTICE '   - Regional settings';
  RAISE NOTICE '   - Branding options';
  RAISE NOTICE '   - Communication defaults';
  RAISE NOTICE '   - Integration settings';
  RAISE NOTICE '   - All existing data preserved!';
END $$;



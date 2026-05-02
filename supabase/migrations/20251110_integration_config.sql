SET search_path TO public, extensions;

-- Integration configuration scaffolding
-- Stores tenant-level channel toggles and encrypted provider credentials

BEGIN;

DROP TABLE IF EXISTS integration_channel_settings CASCADE;
CREATE TABLE integration_channel_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    twilio_voice_enabled BOOLEAN DEFAULT FALSE,
    twilio_sms_enabled BOOLEAN DEFAULT FALSE,
    twilio_whatsapp_enabled BOOLEAN DEFAULT FALSE,
    email_provider TEXT DEFAULT 'sendgrid' CHECK (email_provider IN ('sendgrid', 'gmail', 'outlook', 'ses')),
    default_from_email TEXT,
    default_reply_to_email TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES app_users(id)
);

DROP TABLE IF EXISTS integration_secret_vault CASCADE;
CREATE TABLE integration_secret_vault (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    encrypted_credentials BYTEA NOT NULL,
    credential_version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES app_users(id)
);

ALTER TABLE integration_channel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_secret_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role to manage channel settings" ON integration_channel_settings;
CREATE POLICY "Allow service role to manage channel settings" ON integration_channel_settings
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Channel settings visible to tenant members" ON integration_channel_settings;
CREATE POLICY "Channel settings visible to tenant members" ON integration_channel_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM app_users au
            WHERE au.id = auth.uid()
              AND au.tenant_id = integration_channel_settings.tenant_id
        )
    );


-- Secrets should only be visible to the service role (backend)
DROP POLICY IF EXISTS "Service role can manage integration secrets" ON integration_secret_vault;
CREATE POLICY "Service role can manage integration secrets" ON integration_secret_vault
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE integration_channel_settings IS
'Stores non-sensitive integration toggles and defaults per tenant.';

COMMENT ON TABLE integration_secret_vault IS
'Holds encrypted provider credentials per tenant. Only accessible to service role.';

-- Helper function to upsert encrypted credential blobs
CREATE OR REPLACE FUNCTION integration_store_credentials(
    p_tenant_id UUID,
    p_plain_credentials JSONB,
    p_encryption_key TEXT,
    p_updated_by UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cipher BYTEA;
BEGIN
    IF p_encryption_key IS NULL OR length(p_encryption_key) = 0 THEN
        RAISE EXCEPTION 'integration_store_credentials: encryption key is required';
    END IF;

    v_cipher := pgp_sym_encrypt(p_plain_credentials::TEXT, p_encryption_key);

    INSERT INTO integration_secret_vault AS v (
        tenant_id,
        encrypted_credentials,
        credential_version,
        updated_at,
        updated_by
    ) VALUES (
        p_tenant_id,
        v_cipher,
        1,
        NOW(),
        p_updated_by
    )
    ON CONFLICT (tenant_id) DO UPDATE
        SET encrypted_credentials = EXCLUDED.encrypted_credentials,
            credential_version = integration_secret_vault.credential_version + 1,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by;
END;
$$;

-- Helper function to retrieve decrypted credentials. Service role only.
CREATE OR REPLACE FUNCTION integration_load_credentials(
    p_tenant_id UUID,
    p_encryption_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cipher BYTEA;
    v_plain TEXT;
BEGIN
    IF p_encryption_key IS NULL OR length(p_encryption_key) = 0 THEN
        RAISE EXCEPTION 'integration_load_credentials: encryption key is required';
    END IF;

    SELECT encrypted_credentials
    INTO v_cipher
    FROM integration_secret_vault
    WHERE tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    v_plain := pgp_sym_decrypt(v_cipher, p_encryption_key);
    RETURN v_plain::JSONB;
END;
$$;

GRANT EXECUTE ON FUNCTION integration_store_credentials(UUID, JSONB, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION integration_load_credentials(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION integration_store_credentials IS
'Encrypts and stores tenant provider credentials. Intended for service-role usage.';

COMMENT ON FUNCTION integration_load_credentials IS
'Decrypts tenant provider credentials for backend services. Requires encryption key.';

COMMIT;


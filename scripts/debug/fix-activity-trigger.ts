import 'dotenv/config'
import { Client } from 'pg'

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!projectUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set')
  const projectRef = projectUrl.replace('https://', '').split('.')[0]

  const host = process.env.SUPABASE_DB_HOST
  if (!host) throw new Error('SUPABASE_DB_HOST not set')

  const port = process.env.SUPABASE_DB_PORT || '6543'
  const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD ?? '')
  const connectionString = `postgresql://${process.env.SUPABASE_DB_USER}:${password}@${host}:${port}/${process.env.SUPABASE_DB_NAME}?sslmode=require&pgbouncer=true&options=project%3D${projectRef}`

  const client = new Client({ connectionString })
  await client.connect()

  await client.query(`CREATE OR REPLACE FUNCTION validate_activity_tenant_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contact_tenant_id UUID;
  v_deal_tenant_id UUID;
  v_agent_tenant_id UUID;
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    SELECT tenant_id INTO v_contact_tenant_id FROM contacts WHERE id = NEW.contact_id;
    IF v_contact_tenant_id IS NOT NULL AND v_contact_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Activity contact must belong to same tenant';
    END IF;
  END IF;

  IF NEW.deal_id IS NOT NULL THEN
    SELECT tenant_id INTO v_deal_tenant_id FROM deals WHERE id = NEW.deal_id;
    IF v_deal_tenant_id IS NOT NULL AND v_deal_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Activity deal must belong to same tenant';
    END IF;
  END IF;

  IF NEW.agent_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_agent_tenant_id FROM app_users WHERE id = NEW.agent_user_id;
    IF v_agent_tenant_id IS NOT NULL AND v_agent_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Activity agent must belong to same tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;`)

  await client.end()
  console.log('Trigger updated')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

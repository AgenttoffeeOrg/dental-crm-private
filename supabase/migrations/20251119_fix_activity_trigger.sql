SET search_path TO public, extensions;

-- Patch validate_activity_tenant_relationships to use agent_user_id column
CREATE OR REPLACE FUNCTION validate_activity_tenant_relationships()
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
$$;

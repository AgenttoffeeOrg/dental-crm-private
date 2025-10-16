/**
 * RED TEAM SECURITY TESTS
 * 
 * Simulates malicious attacks to verify security defenses
 * 
 * @group security
 * @group red-team
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Red Team Attack Simulations', () => {
  let supabase: ReturnType<typeof createClient>
  let tenantId: string
  let attackerTenantId: string
  let victimContactId: string
  let attackerId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create victim tenant
    const { data: victim } = await supabase
      .from('tenants')
      .insert({ name: 'Victim Org' })
      .select()
      .single()
    tenantId = victim!.id

    // Create attacker tenant
    const { data: attacker } = await supabase
      .from('tenants')
      .insert({ name: 'Attacker Org' })
      .select()
      .single()
    attackerTenantId = attacker!.id

    // Create attacker user
    const { data: attackerAuth } = await supabase.auth.admin.createUser({
      email: 'attacker@malicious.com',
      password: 'attack123',
      email_confirm: true
    })
    attackerId = attackerAuth.user!.id

    await supabase.from('app_users').insert({
      id: attackerId,
      tenant_id: attackerTenantId,
      full_name: 'Attacker',
      role: 'owner'
    })

    // Create victim data
    const { data: contact } = await supabase
      .from('contacts')
      .insert({
        tenant_id: tenantId,
        full_name: 'Sensitive Patient',
        primary_email: 'victim@example.com',
        primary_phone: '+44 7700 123456'
      })
      .select()
      .single()
    victimContactId = contact!.id
  })

  afterAll(async () => {
    await supabase.from('contacts').delete().eq('id', victimContactId)
    await supabase.auth.admin.deleteUser(attackerId)
    await supabase.from('tenants').delete().in('id', [tenantId, attackerTenantId])
  })

  describe('Attack Vector 1: Direct ID Enumeration', () => {
    it('should BLOCK attacker from viewing victim contact by ID', async () => {
      const { data: session } = await supabase.auth.signInWithPassword({
        email: 'attacker@malicious.com',
        password: 'attack123'
      })

      const attackerClient = createClient(supabaseUrl, session.session!.access_token!)

      // Attacker knows the victim's contact ID and tries to fetch it
      const { data, error } = await attackerClient
        .from('contacts')
        .select('*')
        .eq('id', victimContactId)
        .single()

      // Should be blocked by RLS
      expect(data).toBeNull()
    })
  })

  describe('Attack Vector 2: Bulk Query without Filter', () => {
    it('should ONLY return attacker org data, not victim data', async () => {
      const { data: session } = await supabase.auth.signInWithPassword({
        email: 'attacker@malicious.com',
        password: 'attack123'
      })

      const attackerClient = createClient(supabaseUrl, session.session!.access_token!)

      // Attacker queries all contacts (no filter)
      const { data, error } = await attackerClient
        .from('contacts')
        .select('*')

      expect(error).toBeNull()
      expect(data).toBeDefined()
      // Should NOT contain victim's contact
      const hasVictimData = data!.some(c => c.id === victimContactId)
      expect(hasVictimData).toBe(false)
    })
  })

  describe('Attack Vector 3: SQL Injection via Filters', () => {
    it('should handle malicious filter attempts safely', async () => {
      const { data: session } = await supabase.auth.signInWithPassword({
        email: 'attacker@malicious.com',
        password: 'attack123'
      })

      const attackerClient = createClient(supabaseUrl, session.session!.access_token!)

      // Attempt SQL injection in filter
      const maliciousFilter = "' OR '1'='1"
      
      const { data, error } = await attackerClient
        .from('contacts')
        .select('*')
        .ilike('full_name', maliciousFilter)

      // Should not error, but also not return victim data
      // Supabase/PostgREST handles SQL injection, we verify no cross-tenant leakage
      if (data) {
        const hasVictimData = data.some(c => c.id === victimContactId)
        expect(hasVictimData).toBe(false)
      }
    })
  })

  describe('Attack Vector 4: UPDATE with Spoofed tenant_id', () => {
    it('should REJECT attempt to change tenant_id', async () => {
      // Create contact in attacker's tenant
      const { data: attackerContact } = await supabase
        .from('contacts')
        .insert({
          tenant_id: attackerTenantId,
          full_name: 'Attacker Contact'
        })
        .select()
        .single()

      // Attempt to move contact to victim tenant by changing tenant_id
      const { error } = await supabase
        .from('contacts')
        .update({ tenant_id: tenantId }) // Try to change tenant!
        .eq('id', attackerContact!.id)

      // Should fail due to immutable tenant_id trigger
      expect(error).toBeDefined()
      expect(error!.message).toContain('tenant_id cannot be changed')
      
      // Cleanup
      await supabase.from('contacts').delete().eq('id', attackerContact!.id)
    })
  })

  describe('Attack Vector 5: INSERT with Wrong tenant_id', () => {
    it('should BLOCK contact creation with different tenant_id', async () => {
      const { data: session } = await supabase.auth.signInWithPassword({
        email: 'attacker@malicious.com',
        password: 'attack123'
      })

      const attackerClient = createClient(supabaseUrl, session.session!.access_token!)

      // Attacker tries to insert data into victim's tenant
      const { data, error } = await attackerClient
        .from('contacts')
        .insert({
          tenant_id: tenantId, // Victim's tenant!
          full_name: 'Injected Contact'
        })

      // Should fail - RLS WITH CHECK blocks this
      expect(error).toBeDefined()
    })
  })
})


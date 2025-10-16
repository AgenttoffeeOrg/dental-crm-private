/**
 * RBAC PERMISSIONS ENFORCEMENT TESTS
 * 
 * Verifies role-based permissions are correctly enforced
 * 
 * @group security
 * @group permissions
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('RBAC Permissions Enforcement', () => {
  let supabase: ReturnType<typeof createClient>
  let tenantId: string
  let ownerId: string
  let staffId: string
  let readOnlyId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .insert({ name: 'Permission Test Org' })
      .select()
      .single()
    tenantId = tenant!.id

    // Create users with different roles
    const { data: owner } = await supabase.auth.admin.createUser({
      email: 'owner@test.com',
      password: 'test123',
      email_confirm: true
    })
    ownerId = owner.user!.id

    const { data: staff } = await supabase.auth.admin.createUser({
      email: 'staff@test.com',
      password: 'test123',
      email_confirm: true
    })
    staffId = staff.user!.id

    const { data: readOnly } = await supabase.auth.admin.createUser({
      email: 'readonly@test.com',
      password: 'test123',
      email_confirm: true
    })
    readOnlyId = readOnly.user!.id

    // Create app_users with roles
    await supabase.from('app_users').insert([
      { id: ownerId, tenant_id: tenantId, full_name: 'Owner', role: 'owner' },
      { id: staffId, tenant_id: tenantId, full_name: 'Staff', role: 'staff' },
      { id: readOnlyId, tenant_id: tenantId, full_name: 'Read Only', role: 'read_only' }
    ])
  })

  afterAll(async () => {
    await supabase.auth.admin.deleteUser(ownerId)
    await supabase.auth.admin.deleteUser(staffId)
    await supabase.auth.admin.deleteUser(readOnlyId)
    await supabase.from('tenants').delete().eq('id', tenantId)
  })

  describe('Permission Check Functions', () => {
    it('should grant owner all permissions', async () => {
      const { data, error } = await supabase.rpc('user_has_permission', {
        p_user_id: ownerId,
        p_tenant_id: tenantId,
        p_permission_code: 'deals.delete'
      })

      expect(error).toBeNull()
      expect(data).toBe(true)
    })

    it('should DENY staff delete permissions', async () => {
      const { data, error } = await supabase.rpc('user_has_permission', {
        p_user_id: staffId,
        p_tenant_id: tenantId,
        p_permission_code: 'deals.delete'
      })

      expect(error).toBeNull()
      expect(data).toBe(false) // Staff cannot delete
    })

    it('should grant staff view permissions', async () => {
      const { data, error } = await supabase.rpc('user_has_permission', {
        p_user_id: staffId,
        p_tenant_id: tenantId,
        p_permission_code: 'deals.view'
      })

      expect(error).toBeNull()
      expect(data).toBe(true)
    })

    it('should DENY read-only user create permissions', async () => {
      const { data, error } = await supabase.rpc('user_has_permission', {
        p_user_id: readOnlyId,
        p_tenant_id: tenantId,
        p_permission_code: 'deals.create'
      })

      expect(error).toBeNull()
      expect(data).toBe(false)
    })
  })

  describe('Get User Permissions', () => {
    it('should return all permissions for owner', async () => {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: ownerId,
        p_tenant_id: tenantId
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.length).toBeGreaterThan(40) // Owner has all permissions
    })

    it('should return limited permissions for staff', async () => {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: staffId,
        p_tenant_id: tenantId
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.length).toBeLessThan(30) // Staff has limited permissions
      
      // Verify no delete permissions
      const hasDelete = data!.some((p: any) => p.permission_code.includes('.delete'))
      expect(hasDelete).toBe(false)
    })
  })
})


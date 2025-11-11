require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function main() {
  const loginClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data, error } = await loginClient.auth.signInWithPassword({
    email: 'deepakshegde@gmail.com',
    password: 'Admin@123',
  })

  if (error) {
    console.error('login error', error)
    return
  }

  const token = data.session.access_token
  const authed = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  )

  const { data: memberships, error: membershipError } = await authed
    .from('user_tenant_memberships')
    .select('id, user_id, tenant_id, role, status, all_locations')
    .eq('user_id', data.user.id)

  console.log('membership error', membershipError)
  console.log('membership data', memberships)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

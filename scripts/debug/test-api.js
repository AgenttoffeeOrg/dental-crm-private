require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fetch = require('node-fetch')

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'deepakshegde@gmail.com',
    password: 'Admin@123',
  })

  if (error) {
    console.error('login error', error)
    return
  }

  console.log('session created?', !!data.session)
  const token = data.session.access_token
  console.log('token prefix', token.slice(0, 16))

  const urls = [
    'http://localhost:3000/api/org/memberships',
    'http://localhost:3000/api/onboarding/status',
    'http://localhost:3000/api/scripts/recommendations?limit=3',
  ]

  for (const url of urls) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    console.log(url, res.status)
    const text = await res.text()
    console.log(text)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

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
    process.exit(1)
  }

  const access = data.session.access_token
  const refresh = data.session.refresh_token
  const cookieHeader = `sb-access-token=${access}; sb-refresh-token=${refresh}`

  for (const path of ['/dashboard', '/deals', '/contacts']) {
    const res = await fetch(`http://localhost:3000${path}`, {
      headers: {
        Cookie: cookieHeader,
      },
      redirect: 'manual',
    })

    console.log(path, res.status, res.headers.get('location'))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

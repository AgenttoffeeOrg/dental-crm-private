/**
 * Phase 2b.2.a.2 §11.6 — Storage RLS spot-check.
 *
 * For one of the message-media files:
 *   1) Generate a signed URL via the service-role client → expect 200 + body.
 *   2) Hit the same path via the public bucket URL (no token) → expect 4xx.
 *
 * Outputs both results so the change log can quote them verbatim.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') })

import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const targetPath =
    process.argv[2] ||
    '5aadca14-9786-4aef-bc53-e9287cdd0bbf/9e325edc-eb6d-4e78-95c6-5db354a6aef1/0.jpg'

  console.log('Target path:', targetPath)

  // 1) Signed URL via service role.
  const { data: signed, error: signedErr } = await admin.storage
    .from('message-media')
    .createSignedUrl(targetPath, 60)
  if (signedErr || !signed) {
    console.error('  signed URL generation FAILED:', signedErr?.message)
    process.exit(1)
  }
  console.log('  signed URL prefix:', signed.signedUrl.split('?')[0])

  // Hit the signed URL — expect 200 with content.
  const signedRes = await fetch(signed.signedUrl, { method: 'GET' })
  console.log('  signed-URL GET:', signedRes.status, signedRes.statusText)
  console.log('    content-type:', signedRes.headers.get('content-type'))
  console.log('    content-length:', signedRes.headers.get('content-length'))

  // 2) Unauthenticated direct access to the storage object (no token).
  const directUrl = `${url}/storage/v1/object/message-media/${targetPath}`
  console.log('Direct URL:', directUrl)
  const directRes = await fetch(directUrl, { method: 'GET' })
  console.log('  direct-URL GET (no auth):', directRes.status, directRes.statusText)
  if (directRes.status >= 400) {
    const body = await directRes.text()
    console.log('    body:', body.slice(0, 200))
  }

  // 3) Public-bucket-style URL (also expect 4xx since bucket is private).
  const publicUrl = `${url}/storage/v1/object/public/message-media/${targetPath}`
  console.log('Public URL:', publicUrl)
  const publicRes = await fetch(publicUrl, { method: 'GET' })
  console.log('  public-URL GET:', publicRes.status, publicRes.statusText)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FATAL', err)
    process.exit(1)
  })

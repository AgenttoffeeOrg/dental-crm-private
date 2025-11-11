import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Session } from '@supabase/supabase-js'

type AuthCallbackEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'INITIAL_SESSION'

type CallbackPayload = {
  event?: AuthCallbackEvent
  session?: Session | null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { event, session }: CallbackPayload = await request.json()

    if (!event) {
      return NextResponse.json({ success: false, error: 'Missing event type' }, { status: 400 })
    }

    if (event === 'SIGNED_OUT') {
      await supabase.auth.signOut()
      return NextResponse.json({ success: true })
    }

    if (session && ['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event)) {
      const { error } = await supabase.auth.setSession(session)

      if (error) {
        console.error('[AUTH_CALLBACK] Failed to set session:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[AUTH_CALLBACK] Error handling POST /auth/callback:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirect = requestUrl.searchParams.get('redirect') || '/pipeline'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[AUTH_CALLBACK] Failed to exchange code for session:', error)
      return NextResponse.redirect(new URL('/sign-in?message=confirm-email', requestUrl.origin))
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(redirect, requestUrl.origin))
}


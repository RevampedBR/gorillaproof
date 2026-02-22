import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    // Custom check for type=recovery
    // Supabase auth redirects to /auth/callback?code=xxx&type=recovery for password resets
    // Or it redirects to Next.js route with a hash if not using PKCE flow properly, but PKCE is default in @supabase/ssr
    const next = searchParams.get('next') ?? '/dashboard'
    const type = searchParams.get('type')

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            if (type === 'recovery') {
                // If it's a password recovery, route them to the reset password form instead of dashboard
                return NextResponse.redirect(`${origin}/en/reset-password`)
            }

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can handle locale prefixing logic if necessary here. For now standard routing
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // If error, redirect to login
    return NextResponse.redirect(`${origin}/login?error=Invalid_Auth_Code`)
}

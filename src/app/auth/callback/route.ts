import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    // Custom check for type=recovery
    const next = searchParams.get('next') ?? '/dashboard'
    const type = searchParams.get('type')

    // Portal-specific params (from client user invite links)
    const portalEntity = searchParams.get('portal_entity')

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            if (type === 'recovery') {
                return NextResponse.redirect(`${origin}/pt/reset-password`)
            }

            // Determine redirect target: portal or dashboard
            let redirectPath = next;

            // If this is a portal invite, redirect to portal
            if (portalEntity) {
                redirectPath = '/portal';
            } else {
                // Check if user is a client_user (may have been pre-created during invite)
                try {
                    const { data: isClientUser } = await supabase.rpc('user_is_any_client_user');
                    if (isClientUser) {
                        redirectPath = '/portal';
                    }
                } catch {
                    // Ignore — function may not exist yet, default to dashboard
                }
            }

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            const target = redirectPath.startsWith('/pt') ? redirectPath : `/pt${redirectPath}`;
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${target}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${target}`)
            } else {
                return NextResponse.redirect(`${origin}${target}`)
            }
        }
    }

    // If error, redirect to login
    return NextResponse.redirect(`${origin}/login?error=Invalid_Auth_Code`)
}


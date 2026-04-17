import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest, response: NextResponse) {
    let supabaseResponse = response; // Default is the response passed from next-intl middleware

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // If cookies need setting (e.g., token refresh), clone the request/response
                    // to attach cookies securely.
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                    });

                    supabaseResponse = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });

                    // Re-attach headers from the original response (esp next-intl cookies)
                    response.headers.forEach((value, key) => {
                        if (key !== "set-cookie") {
                            supabaseResponse.headers.set(key, value);
                        }
                    });

                    cookiesToSet.forEach(({ name, value, options }) => {
                        supabaseResponse.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // refreshing the auth token
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Redirect Logic based on path visibility
    const path = request.nextUrl.pathname;

    // We need to strip the locale prefix to match core paths securely
    // e.g., /pt/dashboard becomes /dashboard
    const pathWithoutLocale = path.replace(/^\/(pt)/, '');
    const cleanPath = pathWithoutLocale === "" ? "/" : pathWithoutLocale;

    const isPublicReviewRoute = cleanPath.startsWith("/review");
    const isPortalRoute = cleanPath.startsWith("/portal");
    const isProtectRoute = (cleanPath.startsWith("/dashboard") || cleanPath.startsWith("/admin") || cleanPath.startsWith("/proofs") || cleanPath.startsWith("/clients") || cleanPath.startsWith("/settings") || isPortalRoute) && !isPublicReviewRoute;
    const isAuthRoute = cleanPath.startsWith("/login") || cleanPath.startsWith("/register") || cleanPath.startsWith("/forgot-password") || cleanPath.startsWith("/reset-password");

    // Protect Dashboard + Portal
    if (isProtectRoute && !user) {
        const url = request.nextUrl.clone();
        url.pathname = '/pt/login';
        return NextResponse.redirect(url);
    }

    // Prevent logged in users from seeing login pages
    // Check if they're a client_user and redirect accordingly
    if (isAuthRoute && user) {
        // Check if user is a client portal user
        try {
            const { data } = await supabase.rpc('user_is_any_client_user');
            const url = request.nextUrl.clone();
            url.pathname = data ? '/pt/portal' : '/pt/dashboard';
            return NextResponse.redirect(url);
        } catch {
            const url = request.nextUrl.clone();
            url.pathname = '/pt/dashboard';
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}

import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from '@/utils/supabase/middleware';

// 1. Initialize next-intl middleware
const handleI18nRouting = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
    // 2. Obtain localized response (handles standard next-intl logic)
    const response = handleI18nRouting(request);

    // 3. Pass through Supabase Auth (refreshes tokens and enforces route guards)
    return await updateSession(request, response);
}

export const config = {
    matcher: [
        // Match all pathnames except for
        // - … if they start with `/_next`, `/api`, or contain a dot (e.g. `favicon.ico`)
        '/((?!_next|api|.*\\..*).*)',
    ],
};

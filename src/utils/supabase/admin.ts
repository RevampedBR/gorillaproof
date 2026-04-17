import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;

// CAUTION: This client bypasses RLS. Never use it in client components.
// Lazy-initialized to avoid build-time crash when env vars aren't available.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        if (!_supabaseAdmin) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
            _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            });
        }
        const value = (_supabaseAdmin as any)[prop];
        return typeof value === "function" ? value.bind(_supabaseAdmin) : value;
    },
});

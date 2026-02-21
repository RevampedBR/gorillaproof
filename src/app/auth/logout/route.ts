import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createClient();

    // Sign out on the server
    await supabase.auth.signOut();

    // Extract locale if possible, otherwise default to /login
    const url = new URL(request.url);
    const referer = request.headers.get("referer");
    let redirectUrl = new URL("/login", request.url);

    if (referer) {
        if (referer.includes("/pt/")) redirectUrl = new URL("/pt/login", request.url);
        if (referer.includes("/en/")) redirectUrl = new URL("/en/login", request.url);
    }

    return NextResponse.redirect(redirectUrl);
}

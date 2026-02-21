"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    redirect("/");
}

export async function signup(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const agencyName = formData.get("agencyName") as string;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    });

    if (error) {
        return { error: error.message };
    }

    // Self-Serve SaaS Logic: Automatically provision an Organization for the new user.
    // We use supabaseAdmin to bypass RLS since the user might not be fully authenticated yet
    // or RLS policies might block them from creating orgs directly on signup.
    if (data.user) {
        // 1. Create Organization
        const { data: org, error: orgError } = await supabaseAdmin
            .from("organizations")
            .insert({
                name: agencyName || "My Agency",
                slug:
                    (agencyName || "My Agency").toLowerCase().replace(/[^a-z0-9]+/g, "-") +
                    "-" +
                    Math.random().toString(36).substring(2, 7),
            })
            .select()
            .single();

        if (org && !orgError) {
            // 2. Add user as Owner
            await supabaseAdmin.from("organization_members").insert({
                organization_id: org.id,
                user_id: data.user.id,
                role: "owner",
            });
        }
    }

    // Redirect to a confirmation page or login
    redirect("/login?message=Check your email to continue sign in process");
}

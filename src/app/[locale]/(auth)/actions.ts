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

    redirect("/dashboard");
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
    // We use supabaseAdmin to bypass RLS since the user is not fully authenticated yet.
    if (data.user) {
        // 0. Create public.users record (required by FKs in organization_members, versions, comments)
        await supabaseAdmin.from("users").upsert({
            id: data.user.id,
            email,
            full_name: fullName,
        }, { onConflict: "id" });

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

    // Redirect to dashboard
    redirect("/dashboard");
}

export async function recoverPassword(formData: FormData) {
    const email = formData.get("email") as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?type=recovery`,
    });

    if (error) {
        return { error: error.message };
    }

    redirect("/login?message=Check your email for the password reset link");
}

export async function updatePassword(formData: FormData) {
    const password = formData.get("password") as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
        password: password,
    });

    if (error) {
        return { error: error.message };
    }

    redirect("/dashboard");
}

"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProjects() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: [], error: "Not authenticated" };

    // Get user's organization(s)
    const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
        return { data: [], error: null };
    }

    const orgIds = memberships.map((m) => m.organization_id);

    const { data, error } = await supabase
        .from("projects")
        .select(`
            id,
            name,
            description,
            status,
            organization_id,
            created_at,
            updated_at,
            proofs ( id )
        `)
        .in("organization_id", orgIds)
        .order("updated_at", { ascending: false });

    return {
        data: data ?? [],
        error: error?.message ?? null,
    };
}

export async function createProject(formData: FormData) {
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || "";
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    // Get the user's primary org
    const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) return { error: "No organization found" };

    const { error } = await supabase.from("projects").insert({
        name,
        description,
        organization_id: membership.organization_id,
    });

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}

export async function updateProject(id: string, formData: FormData) {
    const name = formData.get("name") as string;
    const description = (formData.get("description") as string) || "";
    const supabase = await createClient();

    const { error } = await supabase
        .from("projects")
        .update({ name, description, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}

export async function deleteProject(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("projects")
        .update({ status: "archived" })
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}

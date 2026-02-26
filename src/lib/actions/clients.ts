"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getClients() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: [], error: "Not authenticated" };

    const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
        return { data: [], error: null };
    }

    const orgIds = memberships.map((m) => m.organization_id);

    const { data, error } = await supabase
        .from("clients")
        .select(`
            id,
            name,
            description,
            status,
            organization_id,
            created_at,
            updated_at,
            projects ( id )
        `)
        .in("organization_id", orgIds)
        .order("updated_at", { ascending: false });

    return {
        data: data ?? [],
        error: error?.message ?? null,
    };
}

export async function getClientById(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
        .from("clients")
        .select(`
            id,
            name,
            description,
            status,
            organization_id,
            created_at,
            updated_at,
            projects (
                id,
                name,
                description,
                status,
                created_at,
                updated_at,
                proofs ( id )
            )
        `)
        .eq("id", id)
        .single();

    return {
        data: data ?? null,
        error: error?.message ?? null,
    };
}

export async function createClientAction(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name || name.length === 0) return { error: "Name is required" };
    if (name.length > 200) return { error: "Name too long (max 200)" };

    const description = ((formData.get("description") as string) || "").trim().slice(0, 1000);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    try {
        const { data: membership } = await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .limit(1)
            .single();

        if (!membership) return { error: "No organization found" };

        const { error } = await supabase.from("clients").insert({
            name: name.replace(/<[^>]+>/g, ""),
            description: description.replace(/<[^>]+>/g, ""),
            organization_id: membership.organization_id,
        });

        if (error) return { error: error.message };

        revalidatePath("/clients");
        return { error: null };
    } catch {
        return { error: "Failed to create client" };
    }
}

export async function updateClientAction(id: string, formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name || name.length === 0) return { error: "Name is required" };
    const description = ((formData.get("description") as string) || "").trim().slice(0, 1000);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("clients")
            .update({
                name: name.replace(/<[^>]+>/g, ""),
                description: description.replace(/<[^>]+>/g, ""),
                updated_at: new Date().toISOString(),
            })
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath("/clients");
        return { error: null };
    } catch {
        return { error: "Failed to update client" };
    }
}

export async function deleteClientAction(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("clients")
            .update({ status: "archived" })
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath("/clients");
        return { error: null };
    } catch {
        return { error: "Failed to archive client" };
    }
}

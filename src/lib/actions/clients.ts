"use server";

import { createClient as createSupabaseClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getClients() {
    const supabase = await createSupabaseClient();
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
        .from("clients")
        .select("*")
        .in("organization_id", orgIds)
        .order("name", { ascending: true });

    return {
        data: data ?? [],
        error: error?.message ?? null,
    };
}

export async function createClient(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name || name.length === 0) return { error: "Name is required" };
    if (name.length > 200) return { error: "Name too long (max 200)" };

    const supabase = await createSupabaseClient();
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
            organization_id: membership.organization_id,
        });

        if (error) return { error: error.message };

        revalidatePath("/settings");
        revalidatePath("/dashboard");
        return { error: null };
    } catch (err) {
        return { error: "Failed to create client" };
    }
}

export async function updateClient(id: string, formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    if (!name || name.length === 0) return { error: "Name is required" };

    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("clients")
            .update({ name: name.replace(/<[^>]+>/g, ""), updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath("/settings");
        revalidatePath("/dashboard");
        return { error: null };
    } catch (err) {
        return { error: "Failed to update client" };
    }
}

export async function deleteClient(id: string) {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("clients")
            .delete()
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath("/settings");
        revalidatePath("/dashboard");
        return { error: null };
    } catch (err) {
        return { error: "Failed to delete client" };
    }
}

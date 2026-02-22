"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProofs(projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    try {
        const { data, error } = await supabase
            .from("proofs")
            .select(`
                id,
                title,
                status,
                file_type,
                deadline,
                locked_at,
                created_at,
                updated_at,
                versions ( id, comments ( id, status ) )
            `)
            .eq("project_id", projectId)
            .order("updated_at", { ascending: false });

        return {
            data: data ?? [],
            error: error?.message ?? null,
        };
    } catch (err) {
        return { data: [], error: "Failed to fetch proofs" };
    }
}

export async function createProof(projectId: string, formData: FormData) {
    const title = (formData.get("title") as string)?.trim();
    if (!title || title.length === 0) return { error: "Title is required" };
    if (title.length > 200) return { error: "Title too long (max 200)" };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase.from("proofs").insert({
            title: title.replace(/<[^>]+>/g, ""),
            project_id: projectId,
            status: "draft",
        });

        if (error) return { error: error.message };

        revalidatePath(`/projects/${projectId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to create proof" };
    }
}

export async function updateProofStatus(id: string, status: string, projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        // Check if proof is locked
        const { data: proof } = await supabase.from("proofs").select("locked_at").eq("id", id).single();
        if (proof?.locked_at) return { error: "Proof is locked" };

        const { error } = await supabase
            .from("proofs")
            .update({ status, updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath(`/projects/${projectId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to update status" };
    }
}

export async function deleteProof(id: string, projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("proofs")
            .delete()
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath(`/projects/${projectId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to delete proof" };
    }
}

export async function updateProofDeadline(id: string, deadline: string | null, projectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    try {
        const { error } = await supabase
            .from("proofs")
            .update({ deadline, updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) return { error: error.message };

        revalidatePath(`/projects/${projectId}`);
        return { error: null };
    } catch (err) {
        return { error: "Failed to update deadline" };
    }
}

export async function getOrgMembers(orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    try {
        const { data, error } = await supabase
            .from("organization_members")
            .select(`
                user_id,
                role,
                users ( id, email, full_name, avatar_url )
            `)
            .eq("organization_id", orgId);

        return {
            data: data ?? [],
            error: error?.message ?? null,
        };
    } catch (err) {
        return { data: [], error: "Failed to fetch members" };
    }
}

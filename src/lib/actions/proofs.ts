"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getProofs(projectId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("proofs")
        .select(`
            id,
            title,
            status,
            created_at,
            updated_at,
            versions ( id )
        `)
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });

    return {
        data: data ?? [],
        error: error?.message ?? null,
    };
}

export async function createProof(projectId: string, formData: FormData) {
    const title = formData.get("title") as string;
    const supabase = await createClient();

    const { error } = await supabase.from("proofs").insert({
        title,
        project_id: projectId,
        status: "draft",
    });

    if (error) return { error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { error: null };
}

export async function updateProofStatus(id: string, status: string, projectId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("proofs")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { error: null };
}

export async function deleteProof(id: string, projectId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("proofs")
        .delete()
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { error: null };
}

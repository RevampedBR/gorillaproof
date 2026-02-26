"use server";

import { createClient } from "@/utils/supabase/server";
import { getFileCategory } from "@/lib/file-utils";
import { revalidatePath } from "next/cache";

export async function createVersion(
    proofId: string,
    filePath: string,
    fileType: string,
    projectId: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated", data: null };

    // Get the next version number
    const { data: existingVersions } = await supabase
        .from("versions")
        .select("version_number")
        .eq("proof_id", proofId)
        .order("version_number", { ascending: false })
        .limit(1);

    const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

    const { data, error } = await supabase
        .from("versions")
        .insert({
            proof_id: proofId,
            version_number: nextVersion,
            file_url: filePath,
            file_type: fileType,
            uploaded_by: user.id,
        })
        .select()
        .single();

    if (error) return { error: error.message, data: null };

    // Update proof status to in_review and update file_type
    await supabase
        .from("proofs")
        .update({
            status: "in_review",
            updated_at: new Date().toISOString(),
            file_type: getFileCategory(fileType),
        })
        .eq("id", proofId);

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/proofs/${proofId}`);

    return { error: null, data };
}

export async function getVersions(proofId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };

    try {
        const { data, error } = await supabase
            .from("versions")
            .select("id, version_number, file_url, file_type, uploaded_by, created_at")
            .eq("proof_id", proofId)
            .order("version_number", { ascending: false });

        return { data: data ?? [], error: error?.message ?? null };
    } catch (err) {
        return { data: [], error: "Failed to fetch versions" };
    }
}
